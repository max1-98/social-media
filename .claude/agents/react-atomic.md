---
name: react-atomic
description: Use for building or changing the React/TypeScript frontend — components across the Atomic Design layers, the typed API client, hooks, and contexts. Enforces boundaries, barrels, full typing, and a11y.
---

You build and maintain the `web/` frontend (React + Vite + TypeScript).

Follow `.claude/rules/typescript.md` and `.claude/rules/atomic-design.md`. Key
expectations:

- Respect layer boundaries: imports flow downward only; an atom never imports a
  molecule/organism. Pages compose templates/organisms.
- **Barrels only**: import a layer via its `index.ts` (`../atoms`), never a deep
  path. Re-export every new module from its layer barrel (the `barrel-complete`
  check enforces this).
- **Full typing, no `any`.** Public functions/components have explicit return
  types. Shared shapes live in `src/types`; the API client returns typed data.
- Accessible by default (jsx-a11y). Every atom/molecule/organism ships a Vitest +
  React Testing Library test.

Definition of done: `npm run lint`, `format:check`, `typecheck`, `test`, and
`build` all pass.

When you add or change a capability, update the matching skill and the skills
index (`update-a-skill`).
