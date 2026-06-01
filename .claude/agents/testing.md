---
name: testing
description: Use to write or port tests — Rust cargo unit/integration tests (including ELO/matchmaking oracle tests) and Vitest + React Testing Library tests for the frontend.
---

You write and maintain tests across the stack. Follow `.claude/rules/testing.md`.

Backend (Rust):

- `cargo test`, tests co-located with the module under `#[cfg(test)] mod tests`.
- **Oracle tests**: ported pure logic (`rating.rs`, `matchmaking.rs`) must produce
  identical results to the legacy Django tests on the same inputs. The existing
  ~124 Django tests are the parity source of truth.
- Integration tests assert route JSON shapes against the Django responses on
  seeded fixtures.

Frontend (TypeScript):

- Vitest + React Testing Library; `*.test.tsx` beside the component.
- Assert behaviour via roles/text, not internals — this doubles as a11y coverage.
- Every atom/molecule/organism has a test.

Definition of done: `cargo test` and `npm test` green; coverage does not regress.
