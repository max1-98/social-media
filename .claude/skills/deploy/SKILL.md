---
name: deploy
description: Use to deploy the rebuild to production on an EU VM and to run backup/restore — systemd unit, Litestream→EU R2 SQLite replication, and Caddy auto-HTTPS. Covers the deploy/ artifacts and the restore drill.
---

# deploy

Ship the single Axum binary to a fixed-price **EU VM**: systemd runs it under
Litestream (SQLite → EU R2), Caddy terminates TLS. No Redis/Celery/RabbitMQ.
Host config lives in [`deploy/`](../../../deploy/README.md); full steps in the
[runbook](../../../docs/rebuild/05-deploy.md).

## Artifacts (`deploy/`)

| File | Installs to | Role |
|---|---|---|
| `social-media.service` | `/etc/systemd/system/` | runs `litestream replicate -exec server` |
| `litestream.yml` | `/etc/litestream.yml` | SQLite → EU R2 replication + restore-on-boot |
| `Caddyfile` | `/etc/caddy/Caddyfile` | reverse proxy, automatic HTTPS |
| `social-media.env.example` | `/etc/social-media/social-media.env` | prod env (fill secrets, `chmod 600`) |

## Deploy

1. EU VM (encrypted volume), install `caddy` + `litestream`, `useradd --system social`.
2. Copy `server` → `/usr/local/bin/`, SPA → `web/dist` (build or `docker cp`).
3. Place the `deploy/` files; set domain, R2 endpoint/bucket, real secrets.
4. `systemctl enable --now caddy social-media`.
5. Verify: `curl -fsS https://<domain>/api/health` → `{"status":"ok"}`.

## Restore drill (do before go-live — Phase 7 DoD)

```bash
systemctl stop social-media
mv /var/lib/social-media/app.db /tmp/app.db.bak
litestream restore -config /etc/litestream.yml /var/lib/social-media/app.db
systemctl start social-media && curl -fsS https://<domain>/api/health
```

## Compliance gate

Go-live needs the processor paperwork complete: [RoPA](../../../docs/legal/ropa.md),
[sub-processors](../../../docs/legal/sub-processors.md), and signed entries in the
[DPA register](../../../docs/legal/dpa-register.md).

## Done when

App is live on the EU host over HTTPS, the restore drill passes, binary RSS is
< ~50 MB under load, and no Redis/Celery/RabbitMQ run anywhere.
