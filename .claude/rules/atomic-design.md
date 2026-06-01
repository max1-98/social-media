# Atomic Design standards (web/src)

The component library is layered. Imports flow **downward only**; cross-layer
imports go through each layer's **barrel** (`index.ts`). Enforced by
`eslint-plugin-boundaries` (`element-types` + `entry-point`) and the custom
`barrel-complete` check.

## Layers and allowed imports

| Layer | Location | May import |
|---|---|---|
| atoms | `components/atoms` | atoms, types |
| molecules | `components/molecules` | atoms, molecules, types |
| organisms | `components/organisms` | atoms, molecules, organisms, types |
| templates | `components/templates` | + templates |
| pages | `pages` | all layers + api, hooks, contexts, types |
| hooks / contexts | `hooks`, `contexts` | api, hooks, contexts, types |
| api | `api` | api, types |
| types | `types` | types |

An atom must never import a molecule/organism. A page composes templates/organisms.

## Barrels

- Every layer dir has an `index.ts` that re-exports its public surface.
- Consumers import from the barrel: `import { Button } from "../atoms"`.
- The `barrel-complete` linter check fails if a module isn't re-exported.

## Components

- Accessible by default (jsx-a11y recommended). Each atom/molecule/organism has a
  Vitest + React Testing Library test. Atoms wrap MUI primitives (Phase 6).
