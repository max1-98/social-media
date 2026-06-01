# Testing standards

## Backend (Rust)

- `cargo test`. Co-locate unit tests with the module (`#[cfg(test)] mod tests`).
- **Oracle tests:** ported pure logic (`rating.rs`, `matchmaking.rs`) must assert
  identical results to the legacy Django tests on the same inputs — the ~124
  existing tests are the source of truth for parity.
- Integration tests for auth flows and route JSON shapes; diff against the Django
  response shapes on seeded fixtures.

## Frontend (TypeScript)

- Vitest + React Testing Library (`*.test.tsx` next to the component).
- Test behaviour via roles/text, not implementation details
  (`getByRole("button", { name })`), for accessibility coverage too.
- Every atom/molecule/organism ships with a test.

## Definition of done

- New code has tests; `cargo test` and `npm test` are green; coverage does not
  regress. CI runs both on every push.
