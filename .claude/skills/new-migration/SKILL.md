---
name: new-migration
description: Use to create a sqlx database migration plus any seed update, then apply and verify it. Covers schema changes, indexes, and GDPR-required columns (consent_log, tombstone/nullable PII).
---

# new-migration

Add a `sqlx` migration for the SQLite database. See `.claude/rules/rust.md`,
`.claude/rules/gdpr.md`, and the data model in `docs/rebuild/03-phases.md`.

## Steps

1. Create the next ordered migration file under the server's `migrations/` dir
   (forward-only; never edit an applied migration).
2. Write the schema change. For new user-data tables, design for anonymization:
   nullable PII, keep a pseudonymous row, support tombstoning.
3. Add indexes for query hot paths. Update seed data (sports/game-types) if needed.
4. Apply on a fresh DB and confirm it succeeds; keep queries compile-time checked
   (`sqlx`).
5. Add/adjust integration tests that exercise the new schema.
6. Verify: `cargo test`. Then update this skill if the process changed
   (`update-a-skill`).

## Done when

The migration applies cleanly on a fresh DB, indexes exist for hot paths, GDPR
anonymization is supported, and tests pass.
