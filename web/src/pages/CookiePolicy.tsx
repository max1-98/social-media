import type { ReactElement } from "react";

import { Alert, Link, Text } from "../components/atoms";
import { PageLayout } from "../components/templates";

/**
 * Cookie Policy page (scaffold). Copy is PENDING LEGAL SIGN-OFF — see
 * `.claude/rules/gdpr.md` and `docs/legal/cookie-policy.md`. Routed at
 * `/cookie-policy` by the orchestrator (`App.tsx`).
 */
export function CookiePolicy(): ReactElement {
  return (
    <PageLayout>
      <Text variant="h1" gutterBottom>
        Cookie Policy
      </Text>

      <Alert severity="warning" sx={{ mb: 2 }}>
        Draft scaffold — pending legal sign-off. Not legal advice.
      </Alert>

      <Text variant="body1" sx={{ mb: 2 }}>
        We use a small number of cookies. Essential cookies (such as your sign-in session) are
        always active because the site cannot work without them. We load non-essential cookies only
        after you consent.
      </Text>

      <Text variant="h2" gutterBottom>
        Essential cookies
      </Text>
      <Text variant="body1" sx={{ mb: 2 }}>
        Used for authentication and security. These never require consent and are never used for
        advertising or analytics.
      </Text>

      <Text variant="h2" gutterBottom>
        Advertising cookies
      </Text>
      <Text variant="body1" sx={{ mb: 2 }}>
        We use Google AdSense, managed through a Google-certified consent platform with Consent Mode
        v2. No advertising script loads until you accept. If you refuse, ads remain
        non-personalised. You can change your choice at any time via the consent banner.
      </Text>

      <Text variant="body1" sx={{ mb: 2 }}>
        For how we handle the rest of your data, see our{" "}
        <Link href="/privacy-policy">Privacy Policy</Link>.
      </Text>
    </PageLayout>
  );
}
