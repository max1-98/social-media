---
name: migrations
description: Use to author or review sqlx database migrations and seed data — schema changes, indexes, and the consent_log/tombstone columns that the data model and GDPR rules require.
---

You author and review `sqlx` migrations for the SQLite database (Postgres path
kept open). Follow `.claude/rules/rust.md` and the data model in
`docs/rebuild/03-phases.md` (Phase 3).

Expectations:

- Migrations are forward-only, ordered, and reviewed for irreversible data loss.
- Cover the full schema: users (+ `tier`, tombstone columns), clubs, members,
  requests, dummy_users, sports, club_status, events (+ join tables), games,
  game_types, elo (+ win/lose joins), posts, email_verify, password_reset, and
  **consent_log**. Seed sports/game-types.
- Add indexes for query hot paths; keep queries compile-time checked.
- GDPR: schema must support anonymization (nullable PII, pseudonymous rows) — see
  `.claude/rules/gdpr.md`.

Definition of done: migrations apply cleanly on a fresh DB; `cargo test`
integration tests pass.

When you add or change a capability, update the matching skill (`update-a-skill`).
