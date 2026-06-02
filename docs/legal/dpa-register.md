# DPA / SCC Signature Register

> **Scaffold, not legal advice.** This tracks the data-processing agreements that
> must be **signed by a human** before go-live. `[TBD]` rows are not yet executed.
> See [sub-processor list](sub-processors.md), [RoPA](ropa.md), and
> [GDPR design](../rebuild/02-gdpr.md).

Each processor in the [sub-processor list](sub-processors.md) needs a signed DPA
(and SCCs where transfers occur outside the EEA). Track status here.

| Processor | DPA reference / link | SCCs needed | Signed (date) | Owner |
|---|---|---|---|---|
| `[VM host]` | `[DPA URL/ref — TBD]` | `[TBD]` | `[TBD]` | `[name]` |
| Cloudflare (R2) | `[DPA URL/ref — TBD]` | Yes | `[TBD]` | `[name]` |
| Resend | `[DPA URL/ref — TBD]` | Yes | `[TBD]` | `[name]` |
| Google (AdSense + CMP) | `[Google Ads Data Processing Terms — TBD]` | Yes | `[TBD]` | `[name]` |
| Nominatim (OSMF) | usage policy (no DPA — no account PII sent) | N/A | N/A | `[name]` |

## Process

1. Obtain each processor's standard DPA (most offer a self-serve / click-through
   version) and the relevant SCC module.
2. Review against the [RoPA](ropa.md) (purpose, data, retention) and sign.
3. Record the reference + signature date above; store the executed copy securely.
4. Re-review on processor change or annually, whichever is sooner.

> The build scaffolds these records; **executing the agreements is a human/legal
> step** and a precondition for the Phase 7 go-live.
