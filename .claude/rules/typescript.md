# TypeScript standards (web/)

Goal: full typing, no escape hatches, fast to build and easy to refactor.

## Strictness (enforced)

- `tsconfig.app.json` is `strict` plus `noUnusedLocals/Parameters`,
  `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`,
  `noImplicitOverride`, `exactOptionalPropertyTypes`,
  `noPropertyAccessFromIndexSignature`, `forceConsistentCasingInFileNames`.
- ESLint uses `typescript-eslint` **strictTypeChecked + stylisticTypeChecked**
  (type-aware). No `// eslint-disable` without a one-line justification.

## Full typing rules

- **No `any`** — `@typescript-eslint/no-explicit-any` is an error. Use `unknown`
  + narrowing, generics, or a real type.
- Exported/public functions have **explicit return types**
  (`explicit-module-boundary-types`).
- No non-null assertions (`!`) in source (allowed in tests).
- The API client (`src/api`) returns explicitly typed responses; shared shapes
  live in `src/types`.

## Imports

- `import/order`: groups (builtin, external, internal, parent, sibling, index),
  alphabetised, newline between groups.
- **Barrels only**: import a layer through its `index.ts` (`../atoms`), never a
  deep path (`../atoms/Button`). See atomic-design.md.

## Formatting

- Prettier owns formatting (100 width, semicolons, double quotes). Run
  `npm run format` / `format:check`. Don't hand-format.
