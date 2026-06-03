---
name: theming
description: Use when changing the app's look — colours, typography, light/dark schemes, or component styling. Explains the single MUI theme, the CSS-variables + system colour-scheme setup, and the token rules every component follows.
---

# theming

The frontend has **one** theme: `web/src/theme/theme.ts`. It is the single source
of truth for colour, typography, shape and component defaults. Restyle the app
**here** (palette + `theme.components.*` overrides), not with per-component
`sx` colours. See `.claude/rules/atomic-design.md` and `typescript.md`.

## How it works

- **Light + dark, system-matched.** `createTheme({ cssVariables: { colorSchemeSelector: "data" }, colorSchemes: { light, dark } })`. `main.tsx` mounts it with `<ThemeProvider theme={theme} defaultMode="system" disableTransitionOnChange>` + `<CssBaseline/>`, so the active scheme follows the device and flips with no React re-render.
- **No FOUC.** `index.html` has a tiny inline script that stamps `data-mui-color-scheme` on `<html>` before first paint, reading storage key `mui-mode` (defaults to `system`). Keep that key/attribute in sync with MUI's defaults.
- **Self-hosted font.** Inter ships via `@fontsource-variable/inter` (`import "@fontsource-variable/inter/index.css"` in `main.tsx`). **Never** load Google Fonts over the network (GDPR / EU residency — see `rules/gdpr.md`). Family is `"Inter Variable"`.
- **`energy` accent.** A vibrant extra palette token (highlights, scores), declared via module augmentation in `theme.ts` and present in both schemes. Use it like any colour: `sx={{ color: "energy.main" }}`.

## Rules for code

- **Use tokens, never hex.** In components reference `text.secondary`,
  `background.paper`, `divider`, `color="primary"`, etc. — they adapt to both
  schemes for free. The repo has zero hardcoded colours; keep it that way.
- **Scheme-aware overrides read `theme.vars.palette.*`** (the CSS-var form), not
  `theme.palette.*`, so one rule serves both schemes. `theme.vars` is non-optional
  here because `CssThemeVariables { enabled: true }` is augmented in `theme.ts`.
- **Custom SVG atoms** use `currentColor` so they inherit themed text colour.

## Tests

Because the app is committed to CSS variables, render components through the
theme: `import { render, screen } from "../../test/renderWithTheme"` (depth
`../test/...` from `pages/`, `contexts/`, `hooks/`). It wraps the tree in the
real `ThemeProvider` (light scheme) so `theme.vars` resolves; bare RTL `render`
crashes on `theme.vars`. `src/test/setup.ts` polyfills `matchMedia` for jsdom.

## Done when

`theme.ts` (or the targeted component) changes, the look is verified in **both**
schemes (toggle OS appearance via `npm run dev`), and the web bar is green
(`run-standards`). If you add a reusable pattern, update this skill.
