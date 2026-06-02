import type { ReactElement } from "react";

import { Alert, Link, Text } from "../components/atoms";
import { PageLayout } from "../components/templates";

/**
 * Privacy Policy page (scaffold). Copy is PENDING LEGAL SIGN-OFF — see
 * `.claude/rules/gdpr.md` and `docs/legal/privacy-policy.md`. Routed at
 * `/privacy-policy` by the orchestrator (`App.tsx`).
 */
export function PrivacyPolicy(): ReactElement {
  return (
    <PageLayout>
      <Text variant="h1" gutterBottom>
        Privacy Policy
      </Text>

      <Alert severity="warning" sx={{ mb: 2 }}>
        Draft scaffold — pending legal sign-off. Not legal advice.
      </Alert>

      <Text variant="body1" sx={{ mb: 2 }}>
        Sports Social processes personal data to operate the service for EU users. This page
        summarises what we collect, why, and your rights under the GDPR.
      </Text>

      <Text variant="h2" gutterBottom>
        Data we process
      </Text>
      <Text variant="body1" sx={{ mb: 2 }}>
        Account data (email, username, date of birth for age verification), content you create
        (clubs, events, games), and — only with your consent — advertising cookies. We minimise use
        of special-category data.
      </Text>

      <Text variant="h2" gutterBottom>
        Lawful basis &amp; retention
      </Text>
      <Text variant="body1" sx={{ mb: 2 }}>
        Account and gameplay data are processed to perform our contract with you; advertising relies
        on your consent. Retention periods are set out in the full policy and remain subject to
        legal review.
      </Text>

      <Text variant="h2" gutterBottom>
        Your rights
      </Text>
      <Text variant="body1" sx={{ mb: 2 }}>
        You can export your data (account settings → export) and request erasure (account settings →
        delete account). Erasure anonymises your account while preserving shared game history for
        other members. See also our <Link href="/cookie-policy">Cookie Policy</Link>.
      </Text>
    </PageLayout>
  );
}
