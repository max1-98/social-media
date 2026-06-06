import { createTheme } from "@mui/material/styles";
import type { Theme, Shadows } from "@mui/material/styles";

/**
 * The application's single MUI theme — the one source of truth for colour,
 * typography, spacing and shape. It defines a **light and a dark colour scheme**
 * and is driven by CSS variables (`cssVariables`), so the active scheme follows
 * the device (`defaultMode="system"` in `main.tsx`) and flips with no React
 * re-render. Pages and components consume tokens (`color="text.secondary"`,
 * `py: 3`, `borderColor: "divider"`) and the component defaults below rather than
 * hand-rolling colours, so they adapt to both schemes automatically.
 *
 * Scheme-aware component overrides read `theme.vars.palette.*` (the CSS-var
 * form) so a single emitted rule serves both schemes. See the `theming` skill.
 */
declare module "@mui/material/styles" {
  // Enables `theme.vars` / `theme.applyStyles` as non-optional (CSS variables).
  interface CssThemeVariables {
    enabled: true;
  }
  // A vibrant "energy" accent used sparingly for highlights (scores, active nav).
  interface Palette {
    energy: Palette["primary"];
  }
  interface PaletteOptions {
    energy?: PaletteOptions["primary"];
  }
}

const SANS_FALLBACKS = [
  "system-ui",
  "-apple-system",
  '"Segoe UI"',
  "Roboto",
  '"Helvetica Neue"',
  "Arial",
  "sans-serif",
];

// Body / UI text: Inter — highly legible, tabular numerals for stats tables.
const SANS_STACK = ['"Inter Variable"', '"Inter"', ...SANS_FALLBACKS].join(", ");

// Headings / scores: Sora — a modern geometric display face that gives the app
// its sporting character. Both fonts are self-hosted via @fontsource (no Google
// CDN — GDPR / EU residency; see rules/gdpr.md).
const DISPLAY_STACK = ['"Sora Variable"', '"Sora"', ...SANS_FALLBACKS].join(", ");

/**
 * A soft, slightly indigo-tinted elevation scale (25 entries, as MUI requires).
 * Lighter and more modern than MUI's default greys; the same scale reads well in
 * both schemes because it is built from translucent black.
 */
const shadows = Array.from({ length: 25 }, (_, i) => {
  if (i === 0) return "none";
  const y = Math.round(i * 0.9);
  const blur = Math.round(i * 1.6) + 2;
  const spread = Math.max(-1, Math.round(i * -0.2));
  const a1 = Math.min(0.18, 0.05 + i * 0.006).toFixed(3);
  const a2 = Math.min(0.12, 0.03 + i * 0.004).toFixed(3);
  const ambient = `0px ${y.toString()}px ${blur.toString()}px ${spread.toString()}px rgba(74, 20, 45, ${a1})`;
  const key = `0px ${Math.round(y / 2).toString()}px ${Math.round(blur / 2).toString()}px ${spread.toString()}px rgba(22, 11, 20, ${a2})`;
  return `${ambient}, ${key}`;
}) as unknown as Shadows;

export const theme: Theme = createTheme({
  cssVariables: { colorSchemeSelector: "data" },
  colorSchemes: {
    // "Sunrise Run": warm plum base, coral→magenta primary/secondary, gold accent.
    light: {
      palette: {
        primary: { main: "#ce1a4e", light: "#ff4d6d", dark: "#a30e3b", contrastText: "#ffffff" },
        secondary: { main: "#a21caf", light: "#c026d3", dark: "#7a1486", contrastText: "#ffffff" },
        energy: { main: "#f5b43c", light: "#ffcf73", dark: "#b26b00", contrastText: "#3a2400" },
        success: { main: "#1a7f46" },
        warning: { main: "#b9590a" },
        error: { main: "#c81e2b" },
        info: { main: "#1d63d1" },
        background: { default: "#fff4f6", paper: "#ffffff" },
        text: { primary: "#1a0710", secondary: "#74495a" },
        divider: "rgba(26, 7, 16, 0.12)",
      },
    },
    // Dark is the hero scheme: deep plum-black surfaces, brighter coral/magenta.
    dark: {
      palette: {
        primary: { main: "#ff6b85", light: "#ff9bab", dark: "#ff4d6d", contrastText: "#2a0510" },
        secondary: { main: "#e15bec", light: "#f0a6f5", dark: "#c026d3", contrastText: "#2a0510" },
        energy: { main: "#ffc65a", light: "#ffd98a", dark: "#f5b43c", contrastText: "#2a1a00" },
        success: { main: "#34d17c" },
        warning: { main: "#fbbf3c" },
        error: { main: "#ff6b6b" },
        info: { main: "#5b9cff" },
        background: { default: "#160b14", paper: "#21121d" },
        text: { primary: "#fceef3", secondary: "#cdafbd" },
        divider: "rgba(252, 238, 243, 0.14)",
      },
    },
  },
  shape: { borderRadius: 12 },
  shadows,
  typography: {
    fontFamily: SANS_STACK,
    fontWeightBold: 800,
    h1: {
      fontFamily: DISPLAY_STACK,
      fontSize: "2.5rem",
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontFamily: DISPLAY_STACK,
      fontSize: "2rem",
      fontWeight: 800,
      lineHeight: 1.15,
      letterSpacing: "-0.015em",
    },
    h3: {
      fontFamily: DISPLAY_STACK,
      fontSize: "1.625rem",
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: "-0.01em",
    },
    h4: { fontFamily: DISPLAY_STACK, fontSize: "1.3rem", fontWeight: 700, lineHeight: 1.3 },
    h5: { fontSize: "1.125rem", fontWeight: 700 },
    h6: { fontSize: "1rem", fontWeight: 700, letterSpacing: "0.01em" },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 700, letterSpacing: "0.01em" },
    overline: { textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (t) => ({
        body: {
          fontFeatureSettings: '"cv05", "ss01"',
          fontVariantNumeric: "tabular-nums",
          WebkitFontSmoothing: "antialiased",
        },
        "*::-webkit-scrollbar": { width: 10, height: 10 },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: t.vars.palette.divider,
          borderRadius: 8,
        },
      }),
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 18,
          transition: "transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease",
          "&:hover": { transform: "translateY(-1px)" },
          "&:active": { transform: "translateY(0)" },
        },
        outlined: { borderWidth: 1.5, "&:hover": { borderWidth: 1.5 } },
      },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: 16,
          transition: "box-shadow 160ms ease, border-color 160ms ease, transform 160ms ease",
          "&:hover": { boxShadow: t.shadows[6], borderColor: "transparent" },
        }),
      },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: 16 } },
    },
    MuiAppBar: {
      defaultProps: { color: "default", elevation: 0 },
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundColor: t.vars.palette.background.paper,
          borderBottom: `1px solid ${t.vars.palette.divider}`,
        }),
      },
    },
    MuiContainer: { defaultProps: { maxWidth: "lg" } },
    MuiTextField: { defaultProps: { variant: "outlined", size: "small" } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: 10,
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderWidth: 2,
            borderColor: t.vars.palette.primary.main,
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 600 },
        outlined: { borderWidth: 1.5 },
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 12, fontWeight: 500 } },
    },
    MuiAvatar: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          fontWeight: 700,
          backgroundColor: t.vars.palette.primary.main,
          color: t.vars.palette.primary.contrastText,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          backgroundColor: t.vars.palette.background.paper,
          borderRight: `1px solid ${t.vars.palette.divider}`,
        }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: 10,
          "&.active, &.Mui-selected": {
            backgroundColor: `rgba(${t.vars.palette.primary.mainChannel} / 0.12)`,
            color: t.vars.palette.primary.main,
            "& .MuiListItemIcon-root": { color: t.vars.palette.primary.main },
          },
          "&.active:hover, &.Mui-selected:hover": {
            backgroundColor: `rgba(${t.vars.palette.primary.mainChannel} / 0.18)`,
          },
        }),
      },
    },
    MuiLink: {
      styleOverrides: {
        root: { fontWeight: 600, textUnderlineOffset: "0.2em" },
      },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 700 } },
    },
    MuiTabs: {
      styleOverrides: { indicator: { height: 3, borderRadius: 3 } },
    },
  },
});
