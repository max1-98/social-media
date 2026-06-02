import type { ReactElement } from "react";

import { Text } from "../components/atoms";
import { PageLayout } from "../components/templates";
import { useAuth } from "../hooks";

/**
 * Placeholder authenticated home. Feature pages (clubs/events/games) land in
 * later streams; this proves the shell, auth context, and routing are wired.
 */
export function HomePage(): ReactElement {
  const { user } = useAuth();

  return (
    <PageLayout>
      <Text variant="h1" gutterBottom>
        Sports Social
      </Text>
      <Text>{user ? `Signed in as ${user.username}.` : "Welcome."}</Text>
    </PageLayout>
  );
}
