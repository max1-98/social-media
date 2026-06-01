# Rust standards (server/)

Goal: an ultra-light, fast, single static binary that is easy to maintain.

## Structure

- One Axum app: JSON API + static frontend + media proxy. No extra processes
  (no Redis/Celery/RabbitMQ/nginx).
- Domain logic lives in `src/domain/<area>.rs` mirroring the legacy Django apps so
  parity is auditable. Pure logic (`rating.rs`, `matchmaking.rs`) stays free of IO.
- Keep `main.rs` thin: wiring, config, router. Handlers delegate to domain fns.

## Quality bar

- `cargo fmt` clean (`rustfmt.toml`: edition 2021, max_width 100).
- `cargo clippy --all-targets -- -D warnings` clean. `clippy.toml` anchors `msrv`.
- No `unwrap()`/`expect()`/`panic!` on request paths; return typed errors.
- Errors: one app error enum → `IntoResponse` with a stable JSON envelope
  (`{ "error": { "code", "message" } }`) and the right status code.

## Dependencies

- Add a crate only when it earns its weight; prefer the std lib / `tokio` /
  existing deps. Each dep is a GDPR sub-processor-hygiene and binary-size cost.
- `sqlx` with SQLite (compile-time checked queries); keep a Postgres path open.

## Async / cron

- `tokio` intervals in-process; prefer **lazy expiry** over schedulers.

## Tests

- `cargo test`. Port the ELO/matchmaking unit tests as an oracle (see testing.md).
