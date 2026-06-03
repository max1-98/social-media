# GDPR invariants (non-negotiable)

The app processes EU users' data, including minors' data and ad cookies. These
invariants hold in every feature. Full design: `docs/rebuild/02-gdpr.md`.

## Consent

- **No non-essential cookie or ad script before consent.** Ads are gated by the
  Google CMP + Consent Mode v2: blocked until accept, non-personalized on refuse.
- Record every consent choice in `consent_log`.

## Data-subject rights

- `GET /account/export` returns the user's data (JSON portability).
- `DELETE /account` is **erasure-by-anonymization**: tombstone the user, null PII,
  keep the pseudonymous row so shared games/ELO/event stats survive for other
  members; hard-delete purely-personal rows. Never cascade-delete shared history.
- Profile edit = rectification; deactivate flag = restriction/objection.

## Minors

- **Age gate** at registration via `date_of_birth`; below the digital-consent age
  (default 16) block or require parental consent.
- Minimise `biological_gender` usage (only `mixed_sbmm` needs it).

## Identifiers

- **Never expose raw sequential PKs on the wire.** Internal ids stay `i64`; every
  id/FK crossing the API is a `crate::id` newtype that (de)serialises as an opaque
  [Sqids](https://sqids.org/) string (anti-enumeration / count-hiding). It is
  obfuscation, not authz — ownership checks still apply. See `src/id.rs`.

## Residency & security

- EU data residency (host, R2 bucket, providers). `argon2`, TLS, encrypted volume,
  signed expiring media URLs.

## Caveat

Policy copy, age threshold, and DPAs need human/legal sign-off — code scaffolds
for them; this is not legal advice.
