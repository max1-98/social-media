---
name: run-with-docker
description: Use to build and run the rebuild locally with Docker — one image serves the API + SPA on port 8080. Covers the multi-stage Dockerfile, compose.yaml, persistence, and rebuilds.
---

# run-with-docker

Run the whole rebuild (Axum API + React SPA) as one container. The single binary
serves both on port 8080; SQLite migrations + seed run on first start, so the
container is self-initialising. See `Dockerfile` and `compose.yaml` at the repo root.

## Run it

```bash
docker compose up --build          # app at http://localhost:8080
curl -fsS http://localhost:8080/api/health   # -> {"status":"ok"}
docker compose down                # stop (keeps the appdata volume)
```

The SQLite db + uploaded media live in the named `appdata` volume and survive
restarts. Wipe state with `docker compose down -v`.

## How the image is built

Multi-stage `Dockerfile`:

1. `web-build` (`node:22-slim`): `npm ci` + `npm run build` → `web/dist`.
2. `server-build` (`rust:1-slim-bookworm`): `cargo build --release` with
   `SQLX_OFFLINE=true` so the compile-time `sqlx::query!` checks use the committed
   `server/.sqlx` cache (no live DB). A stub-main layer warms the dep cache.
3. `runtime` (`debian:bookworm-slim`): binary + `web/dist`, `ca-certificates`,
   `curl` (healthcheck). Data dirs pre-created so `create_if_missing` works.

## Config

`compose.yaml` overrides the prod-safe defaults in `server/src/config.rs` for
local HTTP: `COOKIE_SECURE=false`, `FRONTEND_BASE_URL=http://localhost:8080`,
DB/media paths under `/app/data`, a dev `MEDIA_SECRET`. Add env vars (e.g.
`RESEND_API_KEY`) to the `environment:` block as needed.

## Gotchas

- Don't ignore `server/.sqlx` in `.dockerignore` — the offline build needs it.
- The legacy `docker-compose.yml` (Django stack) is separate and untouched; use
  `compose.yaml` for the rebuild.
- After changing `Cargo.toml`/`package.json`, rebuild with `--build`.

## Done when

`docker compose up --build` serves http://localhost:8080 and `/api/health`
returns `{"status":"ok"}`.
