import { createTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";

/**
 * The application's single MUI theme — the one source of truth for colour,
 * typography, spacing and shape. Pages and components should consume these
 * tokens (`color="text.secondary"`, `py: 3`, `borderColor: "divider"`) and the
 * component defaults below rather than hand-rolling `sx` values.
 *
 * Mounted once in `main.tsx` via `ThemeProvider` alongside `CssBaseline`, which
 * applies the baseline reset (body margin, font) the app was missing.
 */
const SANS_STACK = [
  '"Inter"',
  "system-ui",
  "-apple-system",
  '"Segoe UI"',
  "Roboto",
  '"Helvetica Neue"',
  "Arial",
  "sans-serif",
].join(", ");

export const theme: Theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#3949ab", light: "#6f74dd", dark: "#00227b" },
    secondary: { main: "#00897b", light: "#4ebaaa", dark: "#005b4f" },
    background: { default: "#f6f7f9", paper: "#ffffff" },
    text: { primary: "#1a2027", secondary: "#5a6472" },
    divider: "#e3e7ec",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: SANS_STACK,
    h1: { fontSize: "2.25rem", fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.25 },
    h3: { fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: "1.25rem", fontWeight: 600 },
    h5: { fontSize: "1.125rem", fontWeight: 600 },
    h6: { fontSize: "1rem", fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 12 } } },
    MuiAppBar: {
      defaultProps: { color: "default", elevation: 0 },
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundColor: t.palette.background.paper,
          borderBottom: `1px solid ${t.palette.divider}`,
        }),
      },
    },
    MuiContainer: { defaultProps: { maxWidth: "lg" } },
    MuiTextField: { defaultProps: { variant: "outlined", size: "small" } },
  },
});
