---
name: port-django-logic
description: Use to port pure business logic from the legacy Django backend to Rust (e.g. elo/services.py to rating.rs) with an oracle test asserting identical outputs on the same inputs.
---

# port-django-logic

Port pure logic from `backend/` (read-only reference) to `server/` with provable
parity. See `.claude/rules/testing.md` and `docs/rebuild/03-phases.md` (Phase 4).

## Steps

1. Read the Python source and its existing tests (the oracle). Identify the pure
   function(s) and their exact constants/branches — e.g. ELO `prob_win` b=1/300,
   `update_elo` k=40; matchmaking winstreak bonuses, sim-annealing, cubic social.
2. Implement the equivalent in the matching Rust module (`rating.rs`,
   `matchmaking.rs`, …), IO-free and fully typed.
3. Write `#[cfg(test)]` oracle tests: feed the same inputs the Django tests use and
   assert the same outputs (mind float tolerances — match the Python rounding).
4. Cross-check edge cases the Python tests cover (ties, score differences, empty
   teams).
5. Verify: `cargo fmt --check && cargo clippy -- -D warnings && cargo test`.
6. Update this skill if you learn a reusable porting trick (`update-a-skill`).

## Done when

The Rust function matches the Python outputs on every oracle input and the Rust
bar is green.
