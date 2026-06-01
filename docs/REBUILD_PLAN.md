# Rebuild Plan & Requirements: Lightweight, Ad-Funded, GDPR-Compliant Sports Social Network

## Session goal

Produce an agreed **plan + requirements** (this document) that can be executed
across multiple future sessions to **rebuild the current app from scratch** as a
*lightweight, predictably near-zero-cost, ad-funded, GDPR-compliant* sports social
network at **full feature parity**. Execution is deliberately sequenced:

> **Plan → scaffold the rebuild in this repo (on the `rebuild` branch) → set up
> standards (`.claude/` config + linters/formatters/CI) → only then implement
> features.**

> **Repo decision (updated):** keep the existing repo rather than create a new
> one. The rebuild is a parity port, so the old code (`backend/`, `frontend/`) is
> a constant reference and is most useful living alongside the new code
> (`server/`, `web/`). One set of CI secrets, branch protection, MCP scope, and
> deploy wiring. Old code is removed at cutover (Phase 7), which also clears the
> inherited Dependabot alerts from the default branch.

Standards come first so every line of feature code is written to a fixed bar.
This session does **not** write feature code; it locks the architecture, the
phase plan, and the "definition of done" for each phase.

## Context (why we're doing this)

The current app (`/home/user/social-media`) is a working Django + React sports
club / matchmaking / ELO platform. Its cost is dominated by **always-on
infrastructure, not workload**: production runs ~9 processes (Django/Daphne, a
Node container, **MySQL, Redis, RabbitMQ, 2× Celery workers, Celery Beat, Flower,
Nginx**). The entire Celery/Redis/RabbitMQ/Channels/Flower/WebSocket layer exists
almost solely to **send a few transactional emails in the background and show a
progress bar**, plus a weekly token-cleanup cron. Media is on **local disk**
(won't survive cheap hosting); geocoding uses the **paid Google Maps API**.

The domain logic is small and well-isolated (ELO in `elo/services.py`,
matchmaking in `games/game_creation.py`, stats in `events/`), so a full
stack/language change is low-risk.

User constraints (confirmed): **cost is the overriding priority** and must be
*predictable* — explicitly **not** usage-metered serverless (fear of runaway
Vercel/Cloudflare bills). Complexity is acceptable; rewriting into Rust is
acceptable if much cheaper to run. Full feature parity. AdSense now, Club+ ad-free
tier later. **GDPR compliance required.** Frontend to be reorganized into
**Atomic Design**. New code lives in **this repo** on the `rebuild` branch,
alongside the old code which stays as a reference until cutover.

---

## Target architecture (the cheap, predictable stack)

One always-on **compiled binary on a fixed-price/free EU VM** — not metered
functions. Rust gives the smallest footprint (~15–30 MB RAM, thousands of req/s
per core), fitting the smallest tiers and scaling far per dollar.

| Concern | Choice | Why |
|---|---|---|
| Backend | **Rust + Axum** single static binary: serves JSON API **+** static frontend **+** media proxy | One process. Kills nginx, Redis, RabbitMQ, Celery, Flower, Daphne. |
| Database | **SQLite** via `sqlx`, file on persistent volume, **Litestream** → R2 backups | No DB server/network cost. `sqlx` keeps a Postgres path open for later scale. |
| Hosting | **Hetzner CX22 (EU) ~€4/mo** or **Oracle Always-Free ARM (EU region)** | Fixed/zero price, **no per-request billing**. EU region for GDPR residency. |
| Media | **Cloudflare R2** (10 GB free, zero egress) via S3 API; `image` crate resize | Replaces local disk; free at scale; EU jurisdiction bucket. |
| Email | **Resend/Brevo free tier** over HTTPS, inline in request | Replaces Celery + SMTP. |
| Geocoding | **Nominatim (OpenStreetMap)** server-side, cached in DB | Drops paid Google Maps key. |
| Auth | In-house: `argon2` hashing + signed JWT/cookie sessions; tokens in DB | Replaces django-oauth-toolkit + social-auth. $0. |
| Async/cron | `tokio` interval in-process; prefer **lazy expiry** | No scheduler service. |
| Ads | **AdSense**, gated by Google **"Privacy & messaging" CMP + Consent Mode v2** (free) | Lawful EEA/UK ads; CMP is free & native. |

**Net recurring cost:** one EU VM (≤ ~€4/mo or free) + free-tier R2. No metered
scaling risk. DB, media, email, geocode all $0 at expected volume.

---

## GDPR & Data Protection (designed in, ~$0)

The app processes EU users' data including **children's data** (DOB collected;
under-18 event modes) and ad cookies, so GDPR/UK-GDPR apply. All below is code +
static pages + free tooling.

1. **Consent:** account data lawful basis = *contract*. **Ad cookies need
   consent** → Google free **Privacy & messaging CMP** + **Consent Mode v2**: ads
   blocked until accept; non-personalized on refuse. Record choices in
   `consent_log`.
2. **Data-subject rights (new endpoints):** `GET /account/export` (JSON
   portability); `DELETE /account` = **erasure-by-anonymization** (games/ELO/event
   stats are shared with other members → tombstone the user, null PII, keep the
   pseudonymous row; hard-delete purely-personal rows). Reuses the existing
   inactive-`dummyuser_` pattern in `clubs/services.py`. Profile edit =
   rectification; deactivate flag = restriction/objection.
3. **Minors:** **age gate** at registration via existing `date_of_birth`; below
   national digital-consent age (13–16, default 16) block or require parental
   consent. Review `biological_gender` (drives `mixed_sbmm`) for minimization.
4. **Security:** TLS via **Caddy auto-HTTPS** (or rustls); `argon2`; encrypted
   volume; signed expiring media URLs; 72-hour breach runbook.
5. **Processors/residency/paperwork (free but required):** EU primary data; sign
   **DPAs + SCCs** (Resend, Google, Cloudflare, host); maintain **RoPA** +
   sub-processor list + **Privacy/Cookie Policy** static pages in `docs/`; define
   retention windows.

> Caveat: privacy-policy wording, chosen age threshold, and DPA signatures need
> human/legal sign-off — the build scaffolds for them, it is not legal advice.

---

## Execution phases & requirements (definition of done)

### Phase 1 — Scaffold (in this repo, `rebuild` branch)
- Add the new monorepo dirs alongside the existing code:
  `server/` (Rust crate), `web/` (React app), `.github/workflows/`, `.claude/`.
  Keep `backend/` + `frontend/` as read-only reference until cutover (Phase 7).
- **DoD:** `cargo build` and the `web` build run; CI skeleton green; README
  explains the layout, the cost/GDPR goals, and the old→new migration intent.

### Phase 2 — Standards first (this is the first real work)
**`.claude/` configuration**
- `.claude/settings.json`: permissions allowlist for routine commands (`cargo
  fmt/clippy/test/build`, `npm`/`pnpm`, `eslint`, `prettier`, `tsc`), env vars,
  and hooks.
- **SessionStart hook** (per the `session-start-hook` skill) so web sessions can
  build/lint/test on a fresh container (toolchain check, `npm ci`, `cargo fetch`).
- `CLAUDE.md`: conventions — directory layout, naming, commit format, how to
  run lint/test/build, **Atomic Design rules**, API/JSON conventions, error
  handling, and **GDPR invariants** (e.g. "deletion anonymizes shared rows", "no
  non-essential cookie before consent").

**Linters / formatters / CI (the fixed bar)**
- Rust: `rustfmt` (`rustfmt.toml`), `clippy` with warnings denied in CI;
  optional `cargo-deny` (license/advisory) — supports GDPR sub-processor hygiene.
- Frontend: `ESLint` (typescript-eslint, react, react-hooks, **jsx-a11y** for
  accessibility, **eslint-plugin-boundaries** to enforce Atomic Design import
  rules — atoms cannot import molecules/organisms), `Prettier`, `tsconfig`
  `strict: true`, `import/order`.
- Pre-commit: `lint-staged` (+ husky or a simple git hook) runs fmt/lint on
  changed files; optional `commitlint` (Conventional Commits).
- CI (GitHub Actions): jobs for Rust fmt+clippy+test, frontend
  lint+typecheck+build. Branch protection requires green.
- Testing standards: `cargo test` for backend (incl. ported ELO/matchmaking unit
  tests as oracle); Vitest + React Testing Library for frontend.
- **DoD:** all tooling installed and wired; CI fails on a deliberately bad commit;
  `CLAUDE.md` + standards documented; an empty "hello" endpoint and a sample atom
  both pass the full pipeline.

### Phase 3 — Backend data model + auth
- `sqlx` migrations for all tables (users + `tier` + tombstone, clubs, members,
  member_requests, dummy_users, sports, club_status, events + member join tables,
  games, game_types, elo + win/lose joins, posts, email_verify, password_reset,
  **consent_log**). Seed sports/game-types.
- Auth module: register/login/logout/JWT, email-verify, password-reset (Resend +
  argon2), **age gate**, consent logging.
- **DoD:** migrations apply; auth flows pass integration tests; tokens lazy-expire.

### Phase 4 — Backend domain (parity)
Mirror Django apps as Rust modules so parity is auditable:
`auth/`, `clubs/`, `events/`, `games/`, `elo/`, `posts/`, plus `matchmaking.rs`,
`rating.rs`, `media.rs`, `email.rs`, `geocode.rs`.
- Port pure logic: `elo/services.py` → `rating.rs` (`prob_win` b=1/300, `g`,
  `result`, `team1Win`, `scoreDifference`, `update_elo` k=40); `game_creation.py`
  → `matchmaking.rs` (`player_elo` winstreak bonuses, `even_teams` sim-annealing,
  `mixed_sbmm`, `sbmm`, `social_count` cubic, `social`); event stat aggregations.
- Reproduce the ~40 routes from the current `urls.py` files with identical JSON
  shapes. Clubs incl. logo upload (R2) + Nominatim geocode.
- **DoD:** every endpoint matches Django response shape on seeded fixtures; ported
  unit tests match Python outputs on identical inputs.

### Phase 5 — GDPR endpoints
- `GET /account/export`, `DELETE /account` (anonymization), policy pages served.
- **DoD:** export complete; deletion preserves other members' stats; verified.

### Phase 6 — Frontend (Atomic Design)
Reuse/port the existing React UI (it is not a cost driver) but **reorganize into
Atomic Design**, repoint the API/auth layer, and add ad/consent UI.

```
web/src/
  components/
    atoms/        Button, Input, Icon, Avatar, Badge, Spinner, Text, ... (wrap MUI primitives)
    molecules/    FormField, SearchBar, MemberRow, ScoreInput, SocialLink, AdSlot
    organisms/    Navbar, ClubCard, EventList, MemberTable, MatchmakingPanel,
                  ConsentBanner, MapView (Leaflet)
    templates/    Page layouts
  pages/          Route-level screens (map from current pages)
  api/            Typed client for the Rust API + new auth
  contexts/ hooks/ types/
```
- ESLint `boundaries` enforces atom→molecule→organism import direction.
- Swap Google Maps geocoding for the backend Nominatim endpoint (Leaflet stays).
- Add **AdSense slots + CMP consent banner (Consent Mode v2)** and privacy/cookie
  policy pages.
- Build to static; served by the Rust binary (`tower-http` `ServeDir` + SPA
  fallback).
- **DoD:** atomic structure enforced by lint; app runs against the Rust binary;
  ads gated behind consent; full user journey works.

### Phase 7 — Deploy & decommission
- EU VM + systemd unit for the binary; Litestream sidecar → EU R2 bucket; DNS/TLS
  (Caddy/rustls). Sign processor DPAs; add RoPA + sub-processor list + policies to
  `docs/`. README updated.
- **DoD:** live on EU host; backup restore tested; no Redis/Celery/RabbitMQ
  anywhere; binary RSS < ~50 MB under load.

---

## Verification (applies across phases)
- **Unit oracle:** ported `rating.rs`/`matchmaking.rs` tests assert identical
  results to the existing 124 Django tests on the same inputs.
- **API parity:** diff Rust JSON against current Django responses for seeded
  fixtures, endpoint by endpoint.
- **End-to-end:** register → age gate → consent → verify email → create club →
  event → activate members → SBMM game → score → complete → ELO/stats update →
  ads render only after consent.
- **GDPR checks:** no non-essential cookie pre-consent; `/account/export`
  complete; `DELETE /account` anonymizes shared rows, hard-deletes personal rows,
  blocks under-age sign-up.
- **Footprint:** confirm single-process, low-RSS, zero queue/broker services.

## Open items to confirm at execution time
- Final **age-of-consent threshold** and parental-consent vs block decision.
- Email provider (Resend vs Brevo) and ad account/AdSense publisher ID.
- Privacy/cookie policy copy (needs human/legal sign-off).

## Deferred (post-parity)
- Club+ ad-free premium → needs a payment provider (Stripe/Paddle) + billing
  webhooks; `users.tier` reserved now.
- Roadmap from `docs/future_plan.txt`: leagues, find players, search, injury mode.
- Horizontal scale: SQLite → managed Postgres (Neon free tier) via `sqlx` —
  connection-string/dialect change, not a rewrite.
