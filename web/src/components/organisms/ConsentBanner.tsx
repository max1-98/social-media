import Box from "@mui/material/Box";
import { useState } from "react";
import type { ReactElement } from "react";

import { Button, Link, Text } from "../atoms";

/**
 * Organism: the consent banner (GDPR — `.claude/rules/gdpr.md`). Shown until the
 * user makes a choice; the choice itself (and any ad/CMP loading) lives in
 * `ConsentContext`, so this component is presentational and receives callbacks.
 *
 * Accessibility: a `region` landmark labelled "Cookie consent" with an explicit
 * heading and focusable Accept/Refuse buttons plus policy links. No ad script is
 * referenced here — nothing non-essential loads from rendering the banner.
 */
export interface ConsentBannerProps {
  /** Whether the banner is visible (true until a choice exists). */
  open: boolean;
  /** Accept non-essential cookies / ads. May be async (logs + Consent Mode v2). */
  onAccept: () => void | Promise<void>;
  /** Refuse non-essential cookies / ads (ads stay non-personalised). */
  onRefuse: () => void | Promise<void>;
}

export function ConsentBanner({
  open,
  onAccept,
  onRefuse,
}: ConsentBannerProps): ReactElement | null {
  const [busy, setBusy] = useState(false);

  if (!open) {
    return null;
  }

  const run = (action: () => void | Promise<void>) => () => {
    setBusy(true);
    void Promise.resolve(action()).finally(() => {
      setBusy(false);
    });
  };

  return (
    <Box
      component="section"
      role="region"
      aria-label="Cookie consent"
      sx={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.snackbar,
        p: 2,
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        boxShadow: 3,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          alignItems: { md: "center" },
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Text variant="h6" component="h2" gutterBottom>
            We value your privacy
          </Text>
          <Text variant="body2" color="text.secondary">
            We use essential cookies to run the site. With your consent we also use cookies for
            advertising. You can accept or refuse non-essential cookies; refusing keeps ads
            non-personalised. See our <Link href="/cookie-policy">Cookie Policy</Link> and{" "}
            <Link href="/privacy-policy">Privacy Policy</Link>.
          </Text>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
          <Button onClick={run(onRefuse)} disabled={busy}>
            Refuse
          </Button>
          <Button onClick={run(onAccept)} disabled={busy}>
            Accept
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
