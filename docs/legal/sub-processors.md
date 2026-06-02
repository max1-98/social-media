# Sub-processor List

> **Scaffold, not legal advice.** Confirm each processor's current DPA, region,
> and the exact entity before publication. See [RoPA](ropa.md),
> [DPA register](dpa-register.md), and [GDPR design](../rebuild/02-gdpr.md).

Third parties that process personal data on our behalf. We keep all primary
processing in the **EU**. Signature status lives in the [DPA register](dpa-register.md).

| Processor | Role / data | Region | Transfer mechanism |
|---|---|---|---|
| `[VM host]` (e.g. Hetzner / Oracle) | Compute + encrypted volume; hosts the app DB & media | EU | DPA (EU processing) |
| Cloudflare (R2) | Media object storage **and** SQLite backups (Litestream) | EU jurisdiction-restricted bucket | DPA + SCCs |
| Resend | Transactional email delivery (verify, password reset) | EU sending region | DPA + SCCs |
| Google (AdSense + Privacy & messaging CMP) | Advertising cookies/identifiers; consent UI | per Google terms | DPA + SCCs (consent-gated) |
| Nominatim (OpenStreetMap Foundation) | Geocoding club location strings → coordinates | EU | usage policy; no account PII sent |

## Notes

- **No personal data reaches Google before consent** — ads/CMP are gated by
  Consent Mode v2 (see [Cookie Policy](cookie-policy.md)).
- **Nominatim** receives only a location string, never account identifiers; we
  send a contactable `User-Agent` per their policy.
- **Litestream → R2** transmits the full database; the bucket is region-locked
  and access uses a single bucket-scoped API token.

## Changes

Material changes to this list are reflected here and in the [RoPA](ropa.md) with a
new review date. Users are notified per the [Privacy Policy](privacy-policy.md) §10.
