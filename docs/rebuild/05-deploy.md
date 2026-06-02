# Deployment & Operations Runbook (Phase 7)

> Part of the [Rebuild Plan](../REBUILD_PLAN.md). Host config lives in
> [`deploy/`](../../deploy/README.md).

One compiled binary serves the JSON API + SPA + media on an EU VM. SQLite is
streamed to EU R2 by Litestream; Caddy terminates TLS. No Redis/Celery/RabbitMQ.

## 1. VM bring-up

1. Provision an **EU-region** VM (Hetzner CX22 ~€4/mo or Oracle Always-Free ARM)
   with an **encrypted volume**. Point DNS `A`/`AAAA` at it.
2. Install runtime deps: `caddy` (apt) and the `litestream` binary
   (`/usr/local/bin/litestream`). Create the service user: `useradd --system social`.
3. Build + copy the app binary to `/usr/local/bin/server` and the SPA to
   `web/dist` — either `cargo build --release` + `npm run build`, or copy them out
   of the Docker image (`docker build` then `docker cp`).
4. `install -d -o social -g social /var/lib/social-media/media` for the db + media.
5. Place config from [`deploy/`](../../deploy/README.md):
   - `social-media.env.example` → `/etc/social-media/social-media.env`
     (fill real secrets, `chmod 600`, `chown social:social`).
   - `litestream.yml` → `/etc/litestream.yml` (set the R2 endpoint + bucket).
   - `Caddyfile` → `/etc/caddy/Caddyfile` (set your domain).
   - `social-media.service` → `/etc/systemd/system/`.
6. Enable: `systemctl daemon-reload && systemctl enable --now caddy social-media`.
7. Verify: `curl -fsS https://<domain>/api/health` returns `{"status":"ok"}`.

## 2. Backup & restore drill (definition of done)

Litestream streams the SQLite WAL to R2 continuously (`sync-interval: 1s`) and
snapshots daily. Restore-on-boot is automatic: the systemd unit runs
`litestream replicate -exec /usr/local/bin/server`, so if `app.db` is missing
Litestream restores it from R2 before the binary starts.

**Test restore (required before go-live):**

```bash
systemctl stop social-media
mv /var/lib/social-media/app.db /tmp/app.db.bak     # simulate data loss
litestream restore -config /etc/litestream.yml /var/lib/social-media/app.db
systemctl start social-media
curl -fsS https://<domain>/api/health                # 200 + data intact
```

Confirm row counts / a known user match the pre-restore state, then remove the
backup copy.

## 3. Operations

- **TLS/certs:** automatic via Caddy (Let's Encrypt); renewal is hands-off.
- **Logs:** `journalctl -u social-media -f` (app) and `/var/log/caddy/` (proxy).
- **Footprint check (DoD < ~50 MB RSS):**
  `systemctl status social-media` or `ps -o rss= -C server` under load.
- **Updates:** copy the new binary + `web/dist`, `systemctl restart social-media`
  (migrations run on start; Litestream keeps replicating).
- **Breach response:** follow the 72-hour breach runbook (notify supervisory
  authority within 72h). Security posture: argon2, TLS, encrypted volume, signed
  expiring media URLs — see [GDPR design](02-gdpr.md).

## 4. Compliance paperwork

Before go-live, complete the processor paperwork in [`docs/legal/`](../legal/README.md):
[RoPA](../legal/ropa.md), [sub-processor list](../legal/sub-processors.md), and the
[DPA register](../legal/dpa-register.md). Policy copy, retention windows, and the
age threshold need human/legal sign-off — this runbook is not legal advice.
