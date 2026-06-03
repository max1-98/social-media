import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import type { ReactElement, ReactNode } from "react";

import { Link, Text } from "../atoms";

/**
 * Template: the application shell. Provides a navbar slot, the main content
 * region, a footer with placeholder policy links, and a dedicated region for a
 * ConsentBanner. The Navbar and ConsentBanner organisms land in later streams,
 * so they are injected as slot props here rather than imported — this template
 * deliberately knows nothing about ads.
 */
export interface PageLayoutProps {
  /** Page content (organisms/pages compose this). */
  children: ReactNode;
  /** Optional navigation organism rendered above the content. */
  navbar?: ReactNode;
  /**
   * Optional consent banner organism. Rendered in its own landmark region.
   * SLOT ONLY — the banner itself (and any ad logic) is implemented in the
   * Consent + Ads stream, never here.
   */
  consentBanner?: ReactNode;
}

export function PageLayout({ children, navbar, consentBanner }: PageLayoutProps): ReactElement {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {navbar !== undefined && <Box component="header">{navbar}</Box>}

      <Container component="main" sx={{ flex: 1, py: 3 }}>
        {children}
      </Container>

      <Box
        component="footer"
        sx={{ borderTop: 1, borderColor: "divider", bgcolor: "background.paper", py: 3, mt: 4 }}
      >
        <Container>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
          >
            <Text variant="caption" color="text.secondary">
              © {new Date().getFullYear()} Sports Social
            </Text>
            <Stack direction="row" spacing={3} component="nav" aria-label="Policies">
              {/* Policy pages are scaffolded in the Consent + Ads stream. */}
              <Link href="/privacy-policy" variant="body2">
                Privacy Policy
              </Link>
              <Link href="/cookie-policy" variant="body2">
                Cookie Policy
              </Link>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Consent banner region: filled by a later stream; empty (and silent) for now. */}
      {consentBanner !== undefined && (
        <Box component="aside" aria-label="Consent">
          {consentBanner}
        </Box>
      )}
    </Box>
  );
}
