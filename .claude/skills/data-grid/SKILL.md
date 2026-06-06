---
name: data-grid
description: Use to display tabular data with the reusable virtualised DataGrid organism — typed columns, header-click sorting, and large-list virtual scrolling. Covers the jsdom test stubs and the page-local stats-helper pattern.
---

# data-grid

`DataGrid` (`web/src/components/organisms/DataGrid.tsx`) is the shared, generic
grid for any list of typed rows. It virtualises rows via
`@tanstack/react-virtual`, so it stays smooth over large datasets. Used by the
Past games page (`web/src/pages/PastGamesPage.tsx`).

## Using it

1. Import from the organisms barrel: `import { DataGrid } from "../components/organisms"`.
2. Define typed columns (`DataGridColumn<T>[]`), memoised in the page:
   - `key`, `header`, `render(row)`.
   - `sortable: true` + `sortValue(row)` for sortable columns (header click
     toggles asc/desc; `aria-sort` is set on the active column).
   - optional `width` (number → px, else CSS track) and `align`.
3. Pass `rows`, `columns`, `getRowId`, and an `ariaLabel` (the grid's accessible
   name → `role="grid"`).
4. Delegate states to the grid: `loading` (spinner), `error` (alert),
   `emptyMessage` (no rows). Don't hand-roll these in the page.
5. Sorting is uncontrolled by default; lift it with `sort` + `onSortChange`, or
   seed it with `initialSort`.

Keep `DataGrid` generic — never add domain fields to it. Domain-specific columns
and derived cells (e.g. a Won/Lost chip) live in the page's column defs.

## Stats helpers (page-local, pure)

Derive per-page statistics in a pure, colocated module (e.g.
`web/src/pages/pastGamesStats.ts`) so they are unit-testable without rendering:

- Take raw rows + identity, return a typed stats shape. Define the shared stat
  types in the **types layer** (`web/src/types`) so organisms (e.g.
  `GameStatsSummary`) can consume them without importing from `pages`
  (boundaries forbid organism→page imports).
- Re-export the helper from the pages barrel (`web/src/pages/index.ts`) — the
  `barrel-complete` check requires every module in `pages/` to be re-exported.

## Testing virtualised grids (jsdom)

jsdom has no layout, so `@tanstack/react-virtual` measures the viewport as 0 and
renders no rows. `web/src/test/setup.ts` fixes this globally:

- a no-op `ResizeObserver` stub, and
- `HTMLElement.prototype.offsetHeight`/`offsetWidth` getters returning a fixed
  viewport (react-virtual measures via `offsetHeight`, **not**
  `getBoundingClientRect`).

So tests render a deterministic subset. Assert:

- `role="grid"` + accessible name, and `aria-rowcount` = the full row count.
- a near-row renders and a far-off row does not (proves virtualisation).
- clicking a sortable `columnheader` reorders cells and flips `aria-sort`.
- loading/error/empty states.

## Done when

Columns are typed and memoised, the grid stays domain-agnostic, stats live in a
pure tested helper, and the web bar is green (`lint`, `typecheck`, `test`,
`build`, `node scripts/lint/repo-lint.mjs`).
