# Context & Target Architecture

> Part of the [Rebuild Plan](../REBUILD_PLAN.md).

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
