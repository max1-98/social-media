# Phase 18 — Native Mobile & Club+ Premium

Part of the [Gamification Roadmap](../ROADMAP.md). Productionise the engagement
loop on **native mobile** (push, passkeys, share sheet) and add the deferred
**Club+ premium** tier for sustainable, ethical monetisation on the reserved
`users.tier`.

See [data-model.md](data-model.md) and [principles.md](principles.md).

## Native mobile

- [ ] Wrap the SPA with **Capacitor** (or React Native) — one codebase, app-store
      builds; ship a PWA as the interim installable shell first.
- [ ] **Passkeys / passwordless** auth (Face/Touch ID) alongside existing cookie
      sessions; frictionless onboarding.
- [ ] **Native push** (APNs/FCM) using the P13 `push_tokens` + prefs; deep links
      into clubs/fixtures/feed; native **share sheet** for recap cards (P17).
- [ ] Respect EU residency + consent for any device identifiers; minors: push off
      by default.

## Club+ premium (ethical monetisation)

- [ ] `subscriptions (user_id, provider, status, current_period_end)`; entitlement
      gating via `users.tier`.
- [ ] Provider integration (Stripe/Paddle) + billing webhooks (signature-verified).
- [ ] Premium perks: ad-free, advanced stats/recaps, custom club challenges,
      bigger clubs — **no pay-to-win on external ELO**.
- [ ] **No spend for minors** without verified parental consent; clear,
      cancel-anytime (no dark-pattern renewal); retain minimal billing record per
      tax law on erasure.

## Routes / API

- [ ] `POST /api/billing/checkout`, `POST /api/billing/webhook`,
      `GET /api/me/subscription`; entitlement checks in gated handlers.

## Frontend

- [ ] Passkey enrol/login, push opt-in prompt (contextual, not on first launch),
      `PremiumBadge`, upgrade page, manage-subscription. Types + API; Vitest.

## Tests

- [ ] Integration: webhook lifecycle (active/cancel/expire) → entitlement; gated
      features respect tier; minor spend blocked; passkey login path.

## Dependencies & DoD

- **Depends on:** P13 (push tokens), P17 (share cards), consent (existing CMP).
- **DoD:** an app-store-ready build with passkeys + native push; Club+ checkout →
  entitlement works; ethical billing + minor protections; `run-standards` green.
