# Execution Phases & Requirements (definition of done)

> Part of the [Rebuild Plan](../REBUILD_PLAN.md).

## Phase 1 — Scaffold (in this repo, `rebuild` branch)
- Add the new monorepo dirs alongside the existing code:
  `server/` (Rust crate), `web/` (React app), `.github/workflows/`, `.claude/`.
  Keep `backend/` + `frontend/` as read-only reference until cutover (Phase 7).
- **DoD:** `cargo build` and the `web` build run; CI skeleton green; README
  explains the layout, the cost/GDPR goals, and the old→new migration intent.

## Phase 2 — Standards first (this is the first real work)
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
  `strict: true`, `import/order`, barrel exports, full typing (no `any`).
- A **custom repo linter** (Node): all `.md` < 150 lines, index-sync, frontmatter,
  barrel completeness — run in CI and at the end of every Claude session.
- Pre-commit: `lint-staged` (+ husky or a simple git hook) runs fmt/lint on
  changed files; optional `commitlint` (Conventional Commits).
- CI (GitHub Actions): jobs for Rust fmt+clippy+test, frontend
  lint+typecheck+build, custom standards lint. Branch protection requires green.
- Testing standards: `cargo test` for backend (incl. ported ELO/matchmaking unit
  tests as oracle); Vitest + React Testing Library for frontend.
- **DoD:** all tooling installed and wired; CI fails on a deliberately bad commit;
  `CLAUDE.md` + standards documented; an empty "hello" endpoint and a sample atom
  both pass the full pipeline.

## Phase 3 — Backend data model + auth
- `sqlx` migrations for all tables (users + `tier` + tombstone, clubs, members,
  member_requests, dummy_users, sports, club_status, events + member join tables,
  games, game_types, elo + win/lose joins, posts, email_verify, password_reset,
  **consent_log**). Seed sports/game-types.
- Auth module: register/login/logout/JWT, email-verify, password-reset (Resend +
  argon2), **age gate**, consent logging.
- **DoD:** migrations apply; auth flows pass integration tests; tokens lazy-expire.

## Phase 4 — Backend domain (parity)
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

## Phase 5 — GDPR endpoints
- `GET /account/export`, `DELETE /account` (anonymization), policy pages served.
- **DoD:** export complete; deletion preserves other members' stats; verified.

## Phase 6 — Frontend (Atomic Design)
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
- ESLint `boundaries` enforces atom→molecule→organism import direction; barrels.
- Swap Google Maps geocoding for the backend Nominatim endpoint (Leaflet stays).
- Add **AdSense slots + CMP consent banner (Consent Mode v2)** and privacy/cookie
  policy pages.
- Build to static; served by the Rust binary (`tower-http` `ServeDir` + SPA
  fallback).
- **DoD:** atomic structure enforced by lint; app runs against the Rust binary;
  ads gated behind consent; full user journey works.

## Phase 7 — Deploy & decommission
- EU VM + systemd unit for the binary; Litestream sidecar → EU R2 bucket; DNS/TLS
  (Caddy/rustls). Sign processor DPAs; add RoPA + sub-processor list + policies to
  `docs/`. README updated.
- **DoD:** live on EU host; backup restore tested; no Redis/Celery/RabbitMQ
  anywhere; binary RSS < ~50 MB under load.
