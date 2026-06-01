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
3. Create `web/src/components/<layer>/<Name>.test.tsx` (Vitest + RTL); assert via
   role/text.
4. Re-export from the layer barrel: add `export { Name } from "./Name";` (and any
   exported types) to `web/src/components/<layer>/index.ts`.
5. Verify: `npm run lint && npm run typecheck && npm test`. The boundaries and
   `barrel-complete` checks must pass.
6. If this introduces a reusable pattern, update this skill (`update-a-skill`).

## Done when

Component + test exist, the barrel re-exports it, and the web bar is green.
