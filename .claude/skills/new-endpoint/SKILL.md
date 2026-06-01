---
name: new-endpoint
description: Use to add an Axum route end-to-end — handler in the right domain module, route registration, typed JSON shape, error handling, and a test (with a parity check against the legacy Django response).
---

# new-endpoint

Add an HTTP endpoint to `server/`. See `.claude/rules/rust.md` and
`.claude/rules/testing.md`.

## Steps

1. Put the logic in the matching `src/domain/<area>.rs`; keep pure logic IO-free.
2. Add a handler that returns `Result<Json<T>, AppError>`. Use the app error enum
   for failures (stable JSON envelope, correct status). No `unwrap`/`panic!`.
3. Register the route in `src/routes.rs` with method + path matching the legacy
   `urls.py` path and the same JSON shape.
4. Define request/response structs with `serde`; mirror the Django field names.
5. Add a `cargo test`: assert status + JSON shape. For ported behaviour, add an
   oracle assertion against the Django output on identical fixtures.
6. Verify: `cargo fmt --check && cargo clippy --all-targets -- -D warnings &&
   cargo test`.
7. Update this skill if the pattern changed (`update-a-skill`).

## Done when

The route returns the parity JSON shape, errors are typed, tests pass, and the
Rust bar is green.
