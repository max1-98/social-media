# Records of Processing Activities (RoPA)

> **Art. 30 GDPR record — scaffold, not legal advice.** Controller identity,
> retention windows, and the digital-consent age need human/legal sign-off. See
> [README](README.md), [Privacy Policy](privacy-policy.md), and
> [GDPR design](../rebuild/02-gdpr.md).

**Controller:** `[Controller legal entity]` — contact `[privacy@domain]`,
EU/UK representative `[name + address]`. **Last reviewed:** TBD.

## Processing activities

| # | Purpose | Data categories | Data subjects | Lawful basis | Retention | Processors |
|---|---|---|---|---|---|---|
| 1 | Account creation & operation | username, email, name, password hash | members | Contract | life of account, then anonymised (§7 policy) | host |
| 2 | Age gate / minors | date of birth, parental-consent flag | members (incl. minors) | Contract / legal obligation | life of account | host |
| 3 | Matchmaking & ELO | game results, ELO, biological gender (`mixed_sbmm` only) | members | Contract | retained as shared history (pseudonymised on erasure) | host |
| 4 | Events & club membership | club/event membership, event stats | members | Contract | shared history | host |
| 5 | Posts / user content | post text, authorship | members | Contract | until deletion (hard-deleted on erasure) | host |
| 6 | Transactional email | email, token | members | Contract | token lazy-expires (3h) | Resend |
| 7 | Advertising | ad cookies / identifiers | visitors | **Consent** (CMP + Consent Mode v2) | per Google CMP | Google |
| 8 | Consent audit trail | choice, timestamp, IP, user-agent | visitors/members | Legal obligation | kept past account deletion | host |
| 9 | Club geocoding | club location string → coordinates | members | Contract | cached result | Nominatim |
| 10 | Media storage | uploaded images (e.g. club logos) | members | Contract | until deletion | Cloudflare R2 |
| 11 | Database backup | full SQLite db (all of the above) | members | Contract (storage limitation) | ~30 days rolling (Litestream) | Cloudflare R2 |

## Security measures (all activities)

EU data residency; TLS in transit (Caddy auto-HTTPS); encrypted volume at rest;
`argon2` password hashing; signed, expiring media URLs; least-privilege service
user + systemd hardening; R2 access via a bucket-scoped API token.

## Data subject rights

Access/portability (`GET /account/export`), erasure-by-anonymization
(`DELETE /account`), rectification (profile edit), restriction/objection
(deactivate). See the [Privacy Policy](privacy-policy.md) §6–7.

## International transfers & sub-processors

EU-region processors under signed DPAs/SCCs. The current list is the
[sub-processor register](sub-processors.md); signature status is tracked in the
[DPA register](dpa-register.md).
