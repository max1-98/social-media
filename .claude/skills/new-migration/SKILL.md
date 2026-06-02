---
name: new-migration
description: Use to create a sqlx database migration plus any seed update, then apply and verify it. Covers schema changes, indexes, and GDPR-required columns (consent_log, tombstone/nullable PII).
---

# new-migration

Add a `sqlx` migration for the SQLite database. See `.claude/rules/rust.md`,
`.claude/rules/gdpr.md`, and the data model in `docs/rebuild/03-phases.md`.

## Setup (once per machine)

- `cargo install sqlx-cli --no-default-features --features sqlite,rustls`.
- `server/.env` holds `DATABASE_URL=sqlite://data/app.db` — the sqlx **query
  macros read it at compile time**. See `server/.env.example`.

## Steps

1. Create the next ordered migration under `server/migrations/`
   (`NNNN_name.sql`, forward-only; never edit an applied migration). Or
   `cargo sqlx migrate add <name>`.
2. Write the schema change. For new user-data tables, design for anonymization:
   nullable PII, keep a pseudonymous row, support tombstoning. SQLite types: PKs
   `INTEGER PRIMARY KEY AUTOINCREMENT`, dates/JSON `TEXT`, booleans `INTEGER`.
3. Add indexes for query hot paths. Update seed data (e.g. `0007_seed.sql`,
   idempotent inserts) if needed.
4. Apply on a fresh DB and confirm: `cd server && sqlx database create &&
   sqlx migrate run`.
5. **Regenerate the offline cache** so CI builds without a DB:
   `cargo sqlx prepare`, then commit the updated `server/.sqlx/`. (CI sets
   `SQLX_OFFLINE=true`.)
6. Add/adjust tests that exercise the new schema (see `db.rs` migration test).
7. Verify: `cargo test`. Then update this skill if the process changed
   (`update-a-skill`).

## Done when

The migration applies cleanly on a fresh DB, the `.sqlx` cache is regenerated +
committed, indexes exist for hot paths, GDPR anonymization is supported, and
tests pass.
