import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import type { ReactElement, ReactNode } from "react";

import { Text } from "../atoms";

export interface AuthCardProps {
  /** Heading for the form (e.g. "Log in", "Create your account"). */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Form content (fields, buttons, helper links). */
  children: ReactNode;
}

/**
 * Organism: the shared shell for authentication screens (login, register, reset,
 * verify). Centres a branded card on the page so the first-impression flows feel
 * focused and polished. Presentational only — pages own the form state/actions.
 */
export function AuthCard({ title, subtitle, children }: AuthCardProps): ReactElement {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        py: { xs: 2, sm: 6 },
      }}
    >
      <Paper
        variant="outlined"
        sx={{ width: "100%", maxWidth: 420, p: { xs: 3, sm: 4 }, borderRadius: 4 }}
      >
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Text
              variant="overline"
              sx={{
                fontWeight: 800,
                background: (t) =>
                  `linear-gradient(90deg, ${t.vars.palette.primary.main}, ${t.vars.palette.secondary.main})`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Sports Social
            </Text>
            <Text variant="h4" component="h1">
              {title}
            </Text>
            {subtitle !== undefined && (
              <Text variant="body2" color="text.secondary">
                {subtitle}
              </Text>
            )}
          </Stack>
          {children}
        </Stack>
      </Paper>
    </Box>
  );
}
