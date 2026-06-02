# Legal & policy pages

User-facing policy scaffolds for the GDPR build (Phase 5). These are the
"Privacy/Cookie Policy static pages in `docs/`" called for by the
[GDPR design](../rebuild/02-gdpr.md). They are wired to the live behaviour of
the data-subject-rights endpoints (`GET /account/export`,
`DELETE /account`) and the consent CMP.

- [Privacy Policy](privacy-policy.md) — what we collect, lawful bases,
  data-subject rights, erasure-by-anonymization, minors, security.
- [Cookie Policy](cookie-policy.md) — essential vs non-essential cookies, the
  CMP + Consent Mode v2 gate, and the `consent_log`.

Processor paperwork (Art. 30 + transfers), maintained for Phase 7 go-live:

- [RoPA](ropa.md) — Records of Processing Activities (purpose, basis, retention).
- [Sub-processor list](sub-processors.md) — third parties + EU residency + role.
- [DPA register](dpa-register.md) — signature tracking for processor agreements.

> **Not legal advice.** Copy, the controller's legal name, retention windows,
> and the digital-consent age threshold need human/legal sign-off before these
> pages are published. Each file stays under the repo's 150-line markdown rule.
