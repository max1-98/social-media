# Verification, Open Items & Deferred Work

> Part of the [Rebuild Plan](../REBUILD_PLAN.md).

## Verification (applies across phases)
- **Unit oracle:** ported `rating.rs`/`matchmaking.rs` tests assert identical
  results to the existing 124 Django tests on the same inputs.
- **API parity:** diff Rust JSON against current Django responses for seeded
  fixtures, endpoint by endpoint.
- **End-to-end:** register → age gate → consent → verify email → create club →
  event → activate members → SBMM game → score → complete → ELO/stats update →
  ads render only after consent.
- **GDPR checks:** no non-essential cookie pre-consent; `/account/export`
  complete; `DELETE /account` anonymizes shared rows, hard-deletes personal rows,
  blocks under-age sign-up.
- **Footprint:** confirm single-process, low-RSS, zero queue/broker services.

## Open items to confirm at execution time
- Final **age-of-consent threshold** and parental-consent vs block decision.
- Email provider (Resend vs Brevo) and ad account/AdSense publisher ID.
- Privacy/cookie policy copy (needs human/legal sign-off).

## Deferred (post-parity)
- Club+ ad-free premium → needs a payment provider (Stripe/Paddle) + billing
  webhooks; `users.tier` reserved now.
- Roadmap from `docs/future_plan.txt`: leagues, find players, search, injury mode.
- Horizontal scale: SQLite → managed Postgres (Neon free tier) via `sqlx` —
  connection-string/dialect change, not a rewrite.
