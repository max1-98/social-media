# Cookie Policy (scaffold)

> **Draft scaffold — not legal advice.** The cookie table and CMP wording need
> human/legal sign-off before publication. See [README](README.md),
> [Privacy Policy](privacy-policy.md), and [GDPR design](../rebuild/02-gdpr.md).

_Last updated: TBD. Effective: TBD._

## 1. What cookies are

Cookies and similar technologies (local storage, identifiers) store small pieces
of data in your browser. We group them as **essential** and **non-essential**.

## 2. Essential cookies (no consent needed)

These are required to run the site and are set without consent:

| Cookie | Purpose | Lifetime |
|---|---|---|
| `access_token` | Keeps you logged in (httpOnly session) | Short-lived |
| `refresh_token` | Renews your session (httpOnly) | Longer-lived |

No advertising or analytics happens through these.

## 3. Non-essential cookies (consent required)

Advertising cookies and identifiers are **non-essential**. We set **no
non-essential cookie or ad script before you consent.** Ads are managed by
Google's Privacy & messaging **CMP** with **Consent Mode v2**:

- **Accept** → personalised ads may be served.
- **Refuse** → ads are non-personalised (or blocked), and no ad identifiers are
  stored.

`[List specific Google/ad cookies once the CMP is wired — TBD.]`

## 4. Your consent is recorded

Every choice you make in the banner is logged to our `consent_log` (the choice,
timestamp, and your IP/user-agent) so we can demonstrate valid consent. This
record is kept even if you later delete your account.

## 5. Changing your consent

You can change or withdraw consent at any time by reopening the consent banner
/ "Privacy settings" `[link — TBD]`, or by clearing cookies in your browser.
Withdrawing consent does not affect processing already carried out.

## 6. More information

See the [Privacy Policy](privacy-policy.md) for the full picture of how we use
personal data, your rights, and how to contact us.
