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
   **Never expose a raw integer PK on the wire** — type every id/FK field that
   crosses the API with its `crate::id` newtype (`ClubId`, `UserId`, …) so it
   (de)serialises as an opaque string; wrap rows with `.into()`, unwrap with
   `.inner()` for queries. Extract id path params with `id::ApiPath<…>`
   (rejects bad/cross-entity ids → 404). Reference data (game_type, sport) stays
   numeric. See `src/id.rs`.
5. Add a `cargo test`: assert status + JSON shape. For ported behaviour, add an
   oracle assertion against the Django output on identical fixtures.
6. If you added/changed any `sqlx::query!`/`query_as!`/`query_scalar!` macro,
   regenerate the offline cache (CI runs `SQLX_OFFLINE=true`):
   `export DATABASE_URL="sqlite://$(pwd)/data/dev.db" && cargo sqlx prepare`,
   then commit the new `server/.sqlx/*.json`.
7. Verify: `cargo fmt --check && cargo clippy --all-targets -- -D warnings &&
   cargo test`.
8. Update this skill if the pattern changed (`update-a-skill`).

## Patterns

- Side-effecting deps (media `Storage`, `Geocoder`) live on `AppState` behind a
  trait. Inject `Arc<dyn Trait>`; tests pass `LocalDiskStorage` (tempdir) +
  `MockGeocoder` — never the network. See `src/media.rs`, `src/geocode.rs`.
- File uploads use Axum `Multipart` (the `multipart` feature). Validate
  content-type + size (`media::validate_image`) before persisting.
- Routes that have no Django app-prefix are `.merge`d into `/api` (not nested);
  one path may serve two verbs via `get(..).delete(..)`. See the clubs block.
  Static and param segments at the same position coexist (e.g. `/event/start`
  beside `/event/:pk1`) — matchit prefers the static route.
- Legacy JSONField maps (keyed by member id as string) live as JSON TEXT columns.
  Pattern: parse to a `BTreeMap` (`parse_int_map`), transform with a **pure**
  helper (so `domain::games` can reuse it), persist via a fixed-column enum, never
  interpolated SQL. See `domain::events` stat helpers.
- Deprecated legacy stubs that returned 501 map to `AppError::NotImplemented`
  (the events `active/` route mirrors this).

## Done when

The route returns the parity JSON shape, errors are typed, tests pass, and the
Rust bar is green.
