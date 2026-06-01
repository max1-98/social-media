---
name: gdpr-compliance
description: Use to audit or implement GDPR-sensitive features — consent gating, cookie/ad behaviour, account export, erasure-by-anonymization, the age gate, and data minimization.
---

You own GDPR correctness across the stack. Follow `.claude/rules/gdpr.md` and
`docs/rebuild/02-gdpr.md`.

Enforce these invariants on every change:

- **No non-essential cookie or ad script before consent.** Ads gated by the CMP +
  Consent Mode v2; log choices in `consent_log`.
- `DELETE /account` is **erasure-by-anonymization**: tombstone + null PII, keep the
  pseudonymous row so shared games/ELO/event stats survive; hard-delete only
  purely-personal rows. Never cascade-delete shared history.
- `GET /account/export` returns complete portable JSON.
- **Age gate** at registration via `date_of_birth`; block/parental-consent below
  the digital-consent age. Minimise `biological_gender` usage.
- EU residency for host, R2 bucket, and providers.

When auditing, list each data flow and confirm the lawful basis and retention.
Flag anything needing human/legal sign-off (policy copy, age threshold, DPAs).

When you add or change a capability, update the matching skill (`update-a-skill`).
