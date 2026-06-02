# deploy/ — production host configuration

Host-side config for running the single Axum binary on an EU VM. None of this
is compiled into the binary; it is placed on the host and referenced by the
[deployment runbook](../docs/rebuild/05-deploy.md).

| File | Installs to | Purpose |
|---|---|---|
| `social-media.service` | `/etc/systemd/system/` | systemd unit; runs the binary under Litestream |
| `litestream.yml` | `/etc/litestream.yml` | continuous SQLite → EU R2 replication + restore-on-boot |
| `Caddyfile` | `/etc/caddy/Caddyfile` | Caddy reverse proxy, automatic HTTPS |
| `social-media.env.example` | copy → `/etc/social-media/social-media.env` | production env (fill real secrets, `chmod 600`) |

See the [runbook](../docs/rebuild/05-deploy.md) for VM bring-up, the
backup/restore drill, and operations. The architecture (one binary, no
Redis/Celery/RabbitMQ) is in the [rebuild plan](../docs/REBUILD_PLAN.md).
