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
- **Self-hosted fonts.** Two faces, both via `@fontsource` (imported in `main.tsx`): **Inter** (`"Inter Variable"`) for body/UI and **Sora** (`"Sora Variable"`) for display headings (`h1`–`h4`, via `DISPLAY_STACK`). Body sets `font-variant-numeric: tabular-nums` so stat columns align. **Never** load Google Fonts over the network (GDPR / EU residency — see `rules/gdpr.md`).
- **"Court Side" palette.** Neutral slate surfaces carrying a sporty teal→cyan `primary`/`secondary` and a warm amber `energy` accent. Dark is the hero scheme (deep slate `background.default #0b1117`); light is near-white `#f8fafc`. The `primary→secondary` gradient (Navbar/Auth/ClubCard) reads teal→cyan.
- **`energy` accent.** A warm amber palette token (highlights, scores) that pops against the cool neutrals, declared via module augmentation in `theme.ts` and present in both schemes. Use it like any colour: `sx={{ color: "energy.main" }}`.

## Rules for code

- **Use tokens, never hex.** In components reference `text.secondary`,
  `background.paper`, `divider`, `color="primary"`, etc. — they adapt to both
  schemes for free. The repo has zero hardcoded colours; keep it that way.
- **Scheme-aware overrides read `theme.vars.palette.*`** (the CSS-var form), not
  `theme.palette.*`, so one rule serves both schemes. `theme.vars` is non-optional
  here because `CssThemeVariables { enabled: true }` is augmented in `theme.ts`.
- **Custom SVG atoms** use `currentColor` so they inherit themed text colour.

## Contrast linter (blocks CI)

`scripts/lint/checks/colorContrast.mjs` (run via `node scripts/lint/repo-lint.mjs`,
in the CI `standards` job + the Stop hook) mechanically prevents dark-on-dark /
light-on-light text. It fails (exit 1) when, in **either** scheme:

- a palette group's `main` clears < **4.5:1** (WCAG AA) against its `contrastText`
  (derived the way MUI derives it for `success`/`warning`/`error`/`info`), or
- `text.primary`/`text.secondary` clears < 4.5:1 on `background.default`/`.paper`, or
- a component `sx` block sets both `color` and `bgcolor` to tokens that clear < 4.5:1, or
- a component hardcodes a hex colour (use a token).

So when you tune the palette, **let the linter be the oracle**: pick colours, run
the linter, adjust `main`/`contrastText`/`text.*` until green. `contrast.mjs`
holds the shared WCAG maths; `theme.test.ts` also asserts AA in both schemes.

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
