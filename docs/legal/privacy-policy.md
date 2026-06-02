# Privacy Policy (scaffold)

> **Draft scaffold — not legal advice.** Wording, the controller's legal name,
> retention windows, and the digital-consent age all need human/legal sign-off
> before publication. See [README](README.md) and
> [GDPR design](../rebuild/02-gdpr.md).

_Last updated: TBD. Effective: TBD._

## 1. Who we are

`[Controller legal entity]` ("we", "us") operates this sports social network and
is the **data controller** for the personal data described here. Contact:
`[privacy@domain]`. EU/UK representative (if applicable): `[name + address]`.

## 2. What we collect

| Data | Why | Lawful basis |
|---|---|---|
| Username, email, first name, surname | Create and run your account | Contract |
| Date of birth | Age gate (minors) and event modes | Contract / legal obligation |
| Biological gender | Mixed-gender matchmaking (`mixed_sbmm`) only | Contract |
| Password (argon2 hash) | Authenticate you | Contract |
| Club memberships, games, ELO, event stats | Provide the core service | Contract |
| Posts you write | Show your content | Contract |
| Consent choices (CMP) + IP/user-agent | Prove ad-cookie consent | Legal obligation |
| Ad cookies / identifiers | Show ads | **Consent** (see Cookie Policy) |

We minimise `biological_gender` — it is only read by mixed-gender matchmaking.

## 3. Lawful bases

- **Contract** for account data and the core social/competition features.
- **Consent** for non-essential (advertising) cookies — gated by the Google CMP
  and Consent Mode v2; ads are blocked until you accept and non-personalised if
  you refuse. See the [Cookie Policy](cookie-policy.md).
- **Legal obligation** for keeping a consent audit trail (`consent_log`).

## 4. Sharing & processors

We use EU-region processors under signed DPAs/SCCs: `[Resend]` (email),
`[Google]` (ads/CMP), `[Cloudflare]` (CDN/R2 media), `[host]`. A current
sub-processor list is kept in our RoPA. We do not sell personal data.

## 5. Retention

Account data is kept for the life of your account. On deletion we
**anonymise** rather than fully erase (see §7). Short-lived tokens (email verify,
password reset) expire automatically. `[Define exact windows — TBD.]`

## 6. Your rights

You can access, rectify, restrict, object to, port, and erase your data, and
lodge a complaint with your supervisory authority. In the app:

- **Portability / access** — `GET /account/export` returns your data as JSON
  (profile, consent log, club memberships, posts).
- **Erasure** — `DELETE /account`, see §7.
- **Rectification** — edit your profile.
- **Restriction / objection** — deactivate your account.

## 7. Account deletion (erasure-by-anonymization)

Your games, ELO, and event stats are **shared history** with other members, so
deleting your account does not destroy theirs. Instead we:

- null your PII (email, name, date of birth) and replace your username with a
  pseudonym (`deleted_user_<id>`), and tombstone the row;
- hard-delete purely-personal data (your posts, pending join requests, login
  sessions, and verification/reset tokens);
- keep the pseudonymous row so shared games/ELO/event records stay intact.

This is irreversible and requires re-entering your password to confirm.

## 8. Minors

We operate an **age gate** at registration. Users below the digital-consent age
(default 16, `[confirm per market]`) are blocked or require parental consent.

## 9. Security & residency

Data is hosted in the EU on an encrypted volume, served over TLS, with argon2
password hashing and signed, expiring media URLs.

## 10. Changes & contact

We will post updates here with a new "Last updated" date. Questions:
`[privacy@domain]`.
