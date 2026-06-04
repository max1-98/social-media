# Phase 10 — Integrity & Anti-Cheat (deep detection & review)

Part of the [Gamification Roadmap](../ROADMAP.md). Phase 8 ships the **structural**
defense (dummies sandboxed to internal ELO; external requires real, verified,
distinct, cross-club, two-confirmed play). This phase adds the **detection +
review** layer for residual abuse — collusion, boosting, smurfing, ratdummy
variants — once cross-club external play actually matters.

Principle: **flag, don't auto-ban** (avoid false positives); humans review.
See [data-model.md](data-model.md) (P10 tables) and [principles.md](principles.md).

## Signals & heuristics

- [ ] `match_signals (game_id, ip_hash, device_hash, ...)` — **hashed**, not raw
      (GDPR). Capture at result time.
- [ ] σ-guard tuning + **diminishing returns** on repeated opponents (cap external
      gain when the same small set of players keeps feeding wins).
- [ ] Account-age + email-verification gate for external eligibility; flag bursts
      of accounts created together / sharing device/IP (Sybil signal).
- [ ] Collusion/boosting heuristics: lopsided repeated matchups, improbable rating
      velocity, win-trading patterns, one account always losing to another.

## Flags & review

- [ ] `integrity_flags (subject_user_id, kind, evidence_json, status, created_at)`;
      open → reviewing → upheld/dismissed.
- [ ] User **report** endpoint (report a result / player) → creates a flag.
- [ ] Staff review queue (read-only evidence, action: void result / freeze
      external rating / dismiss). Reuse `is_staff` (users table).
- [ ] Remediation: void a result re-runs the rating delta in reverse
      (idempotent); freeze marks external rating non-updating pending review.

## Rate limits & abuse hygiene

- [ ] Per-user/club rate limits on fixtures + result submissions.
- [ ] Idempotency keys on result/confirm endpoints (no double-counting).
- [ ] Audit log of rating-affecting actions (who/when/what), pseudonymous.

## Routes / API

- [ ] `POST /api/report` (result/player); `GET /api/admin/flags`,
      `POST /api/admin/flags/:id/{uphold,dismiss}`; `POST /api/admin/result/:id/void`.

## Frontend

- [ ] Report button on fixtures/results; staff `FlagReview` organism + admin page;
      "rating under review" badge. Types + `integrity` API module; Vitest.

## Tests

- [ ] Integration: report → flag created; void → ratings reverted exactly;
      frozen rating stops updating; rate limit + idempotency enforced.
- [ ] Heuristic unit tests on synthetic collusion/boosting histories.

## Dependencies & DoD

- **Depends on:** P8 (scope/gate) + P9 (fixtures). Hardens P15 leagues.
- **DoD:** abusive patterns are detectable + reviewable; voids are exact and
  idempotent; raw PII never stored (only hashes); `run-standards` green.
