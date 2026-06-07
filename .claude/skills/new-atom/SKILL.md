---
name: new-atom
description: Use to scaffold a new Atomic Design component (atom, molecule, organism, or template) with a test, correct layer boundaries, and a complete barrel export.
---

# new-atom

Add a component to `web/src` honoring boundaries, barrels, and full typing. See
`.claude/rules/atomic-design.md` and `.claude/rules/typescript.md`.

## Steps

1. Pick the layer by what it composes:
   - atom = primitive (no internal imports); molecule = atoms; organism = atoms +
     molecules; template = layout of organisms.
2. Create `web/src/components/<layer>/<Name>.tsx`:
   - Typed props interface; explicit return type (`ReactElement`).
   - Import only allowed lower layers, via their **barrels** (`../atoms`).
   - Accessible markup (correct roles/labels).
   - **Style via theme tokens, never hardcoded colours** (`color="primary"`,
     `bgcolor: "background.paper"`); custom SVG uses `currentColor`. See the
     `theming` skill.
3. Create `web/src/components/<layer>/<Name>.test.tsx`; assert via role/text.
   Import `render`/`screen` from the theme helper, not RTL directly:
   `import { render, screen } from "../../test/renderWithTheme"` (so `theme.vars`
   resolves — see the `theming` skill).
4. Re-export from the layer barrel: add `export { Name } from "./Name";` (and any
   exported types) to `web/src/components/<layer>/index.ts`.
5. **If you added a page** (`web/src/pages`), make it reachable in the same change
   (see `.claude/rules/atomic-design.md` → "Pages must be reachable"):
   - add a `<Route>` in `web/src/App.tsx` (the `page-routed` check enforces this);
   - add a nav entry — a `DEFAULT_NAV_ITEMS` item in the `Navbar` for a global
     page, or a link/button from the parent page for a scoped one.
6. Verify: `npm run lint && npm run typecheck && npm test && node
   scripts/lint/repo-lint.mjs`. The boundaries, `barrel-complete`, and
   `page-routed` checks must pass.
7. If this introduces a reusable pattern, update this skill (`update-a-skill`).

## Done when

Component + test exist, the barrel re-exports it, any new page is routed **and**
linked from navigation, and the web bar + repo-lint are green.
