# GDPR & Data Protection (designed in, ~$0)

> Part of the [Rebuild Plan](../REBUILD_PLAN.md).

The app processes EU users' data including **children's data** (DOB collected;
under-18 event modes) and ad cookies, so GDPR/UK-GDPR apply. All below is code +
static pages + free tooling.

1. **Consent:** account data lawful basis = *contract*. **Ad cookies need
   consent** → Google free **Privacy & messaging CMP** + **Consent Mode v2**: ads
   blocked until accept; non-personalized on refuse. Record choices in
   `consent_log`.
2. **Data-subject rights (new endpoints):** `GET /account/export` (JSON
   portability); `DELETE /account` = **erasure-by-anonymization** (games/ELO/event
   stats are shared with other members → tombstone the user, null PII, keep the
   pseudonymous row; hard-delete purely-personal rows). Reuses the existing
   inactive-`dummyuser_` pattern in `clubs/services.py`. Profile edit =
   rectification; deactivate flag = restriction/objection.
3. **Minors:** **age gate** at registration via existing `date_of_birth`; below
   national digital-consent age (13–16, default 16) block or require parental
   consent. Review `biological_gender` (drives `mixed_sbmm`) for minimization.
4. **Security:** TLS via **Caddy auto-HTTPS** (or rustls); `argon2`; encrypted
   volume; signed expiring media URLs; 72-hour breach runbook.
5. **Processors/residency/paperwork (free but required):** EU primary data; sign
   **DPAs + SCCs** (Resend, Google, Cloudflare, host); maintain **RoPA** +
   sub-processor list + **Privacy/Cookie Policy** static pages in `docs/`
   ([legal/](../legal/README.md) scaffolds); define retention windows.

> Caveat: privacy-policy wording, chosen age threshold, and DPA signatures need
> human/legal sign-off — the build scaffolds for them, it is not legal advice.
