# social-media

A sports club / matchmaking / ELO social network.

This repo is mid-**rebuild**: we are porting the working app to a deliberately
**lightweight, predictably near-zero-cost, ad-funded, GDPR-compliant** stack at
full feature parity. The full plan lives in
[`docs/REBUILD_PLAN.md`](docs/REBUILD_PLAN.md).

## Why the rebuild

The legacy stack's cost is dominated by **always-on infrastructure, not
workload**: production ran ~9 processes (Django/Daphne, a Node container, MySQL,
Redis, RabbitMQ, 2× Celery workers, Celery Beat, Flower, Nginx) largely to send a
few transactional emails and show a progress bar. Media sat on local disk and
geocoding used the paid Google Maps API.

The target is **one always-on compiled binary on a fixed-price/free EU VM** — not
metered serverless (no runaway-bill risk):

| Concern | New choice |
|---|---|
| Backend | Rust + **Axum** single binary: JSON API **+** static frontend **+** media proxy |
| Database | **SQLite** via `sqlx` (Litestream → R2 backups; Postgres path kept open) |
| Hosting | Hetzner CX22 (~€4/mo) or Oracle Always-Free ARM, **EU region** |
| Media | **Cloudflare R2** (free tier) via S3 API |
| Email | **Resend/Brevo** free tier over HTTPS, inline in request |
| Geocoding | **Nominatim** (OpenStreetMap), cached |
| Auth | In-house `argon2` + signed JWT/cookie sessions |
| Ads | **AdSense** gated by Google CMP + Consent Mode v2 |

GDPR is designed in (consent logging, data export, erasure-by-anonymization, age
gate, EU data residency) — see the plan for detail.

## Repository layout

The legacy Django/CRA code was removed at cutover (Phase 7); the rebuild is the
whole app now.

```
server/    Backend — Rust + Axum single binary (API + static SPA + media proxy)
web/       Frontend — Vite + React + TypeScript, Atomic Design
deploy/    Production host config — systemd, Litestream→R2, Caddy
docs/      Rebuild plan, GDPR design, legal/policy docs, deploy runbook
.github/   CI workflows
```

### `server/` — Rust backend

```bash
cd server
cargo run                 # serves http://localhost:8080
#   GET /api/health  -> {"status":"ok"}
#   GET /api/hello   -> {"message":"..."}
# Built SPA (web/dist) is served at / with SPA fallback. Override its location
# with WEB_DIST_DIR; override the port with PORT.

cargo fmt --check         # formatting
cargo clippy --all-targets -- -D warnings
cargo test
```

Domain logic is organised to mirror the legacy Django apps 1:1
(`src/domain/{auth,clubs,events,games,elo,posts}.rs`, plus `rating.rs`,
`matchmaking.rs`, `media.rs`, `email.rs`, `geocode.rs`) so the port is auditable
app-by-app. These are placeholders today and are filled in over phases 3–5.

### `web/` — React frontend

```bash
cd web
npm install
npm run dev               # Vite dev server, proxies /api -> :8080
npm run typecheck         # tsc, strict
npm test                  # vitest
npm run build             # -> web/dist (served by the Rust binary)
```

Components follow **Atomic Design** under `src/components/`
(`atoms → molecules → organisms → templates`), with `pages/`, `api/`,
`contexts/`, `hooks/`, and `types/`. Import direction (atoms can't import
molecules, etc.) is enforced by ESLint in Phase 2.

### Run the whole app with Docker

One image builds the SPA and the Axum binary; the binary serves both the API and
the static frontend on a single port. No database container is needed (embedded
SQLite, migrations + seed run on first start).

```bash
docker compose up --build      # app at http://localhost:8080
#   GET /api/health -> {"status":"ok"}
```

The SQLite db and uploaded media persist in the `appdata` volume across restarts.
See the `run-with-docker` skill for local dev.

## Production deployment

The app runs as one binary on a fixed-price **EU VM**: systemd supervises it
under **Litestream** (SQLite → EU R2 backups), and **Caddy** terminates TLS
(auto-HTTPS). Host config is in [`deploy/`](deploy/README.md); step-by-step
bring-up + the backup/restore drill are in the
[deployment runbook](docs/rebuild/05-deploy.md). GDPR processor paperwork lives in
[`docs/legal/`](docs/legal/README.md) (RoPA, sub-processors, DPA register).

## Rebuild status

Parity rebuild complete through **Phase 7 — deploy & decommission**: the legacy
Django/CRA stack has been removed, and production runs as a single Axum binary.
See [`docs/REBUILD_PLAN.md`](docs/REBUILD_PLAN.md) for the full phased plan and the
definition of done for each phase.
