import Box from "@mui/material/Box";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { Alert, Spinner, Text } from "../atoms";

/** Ascending or descending sort direction. */
export type SortDirection = "asc" | "desc";

/** A single active-sort descriptor: which column and which direction. */
export interface DataGridSort {
  key: string;
  direction: SortDirection;
}

/** Column definition for the {@link DataGrid}, generic over the row type. */
export interface DataGridColumn<T> {
  /** Stable column id; matches {@link DataGridSort.key} when sorting. */
  key: string;
  /** Header cell content. */
  header: ReactNode;
  /** Body cell content for a row. */
  render: (row: T) => ReactNode;
  /** Whether the column header toggles sorting (default false). */
  sortable?: boolean;
  /** Comparable value for sorting; required for a meaningful `sortable` column. */
  sortValue?: (row: T) => string | number;
  /** CSS grid track size (number → px); defaults to `1fr`. */
  width?: number | string;
  /** Cell text alignment (default `left`). */
  align?: "left" | "right" | "center";
}

export interface DataGridProps<T> {
  /** The rows to render. */
  rows: T[];
  /** Column definitions, left to right. */
  columns: DataGridColumn<T>[];
  /** Stable React key / row id for a row. */
  getRowId: (row: T) => string;
  /** Accessible name for the grid. */
  ariaLabel: string;
  /** Estimated row height in px for the virtualizer (default 52). */
  rowHeight?: number;
  /** Max height of the scroll viewport in px (default 480). */
  maxHeight?: number;
  /** Show a spinner instead of the grid. */
  loading?: boolean;
  /** Show an error alert instead of the grid. */
  error?: string | null;
  /** Content shown when there are no rows. */
  emptyMessage?: ReactNode;
  /** Controlled sort state; pair with {@link DataGridProps.onSortChange}. */
  sort?: DataGridSort;
  /** Controlled-sort change handler. */
  onSortChange?: (next: DataGridSort) => void;
  /** Initial sort for uncontrolled mode. */
  initialSort?: DataGridSort;
}

function trackSize(width: number | string | undefined): string {
  if (width === undefined) return "minmax(0, 1fr)";
  return typeof width === "number" ? `${String(width)}px` : width;
}

function ariaSortFor(
  active: boolean,
  direction: SortDirection,
): "ascending" | "descending" | "none" {
  if (!active) return "none";
  return direction === "asc" ? "ascending" : "descending";
}

/**
 * Organism: a generic, virtually scrolled data grid. Renders only the rows in
 * view via `@tanstack/react-virtual`, so it stays smooth over large datasets.
 * Sorting is uncontrolled by default (click a sortable header to toggle) but can
 * be lifted via `sort` + `onSortChange`. Games-agnostic and reusable: callers
 * supply typed columns and a row-id getter.
 */
export function DataGrid<T>({
  rows,
  columns,
  getRowId,
  ariaLabel,
  rowHeight = 52,
  maxHeight = 480,
  loading = false,
  error = null,
  emptyMessage = "No rows to display.",
  sort,
  onSortChange,
  initialSort,
}: DataGridProps<T>): ReactElement {
  const [internalSort, setInternalSort] = useState<DataGridSort | null>(initialSort ?? null);
  const activeSort = sort ?? internalSort;

  const applySort = (key: string): void => {
    const direction: SortDirection =
      activeSort?.key === key && activeSort.direction === "asc" ? "desc" : "asc";
    const next: DataGridSort = { key, direction };
    if (onSortChange) onSortChange(next);
    else setInternalSort(next);
  };

  const sortedRows = useMemo(() => {
    if (activeSort === null) return rows;
    const column = columns.find((c) => c.key === activeSort.key);
    if (column?.sortValue === undefined) return rows;
    const getValue = column.sortValue;
    const factor = activeSort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av < bv) return -1 * factor;
      if (av > bv) return 1 * factor;
      return 0;
    });
  }, [rows, columns, activeSort]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 6,
  });

  const gridTemplateColumns = columns.map((c) => trackSize(c.width)).join(" ");

  if (loading) return <Spinner />;
  if (error !== null) return <Alert severity="error">{error}</Alert>;

  const headerRow = (
    <Box
      role="row"
      sx={{
        display: "grid",
        gridTemplateColumns,
        position: "sticky",
        top: 0,
        zIndex: 1,
        bgcolor: (t) => t.vars.palette.background.paper,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      {columns.map((column) => {
        const isActive = activeSort?.key === column.key;
        const sortable = column.sortable === true && column.sortValue !== undefined;
        return (
          <Box
            key={column.key}
            role="columnheader"
            aria-sort={ariaSortFor(isActive, activeSort?.direction ?? "asc")}
            onClick={
              sortable
                ? () => {
                    applySort(column.key);
                  }
                : undefined
            }
            sx={{
              px: 2,
              py: 1.5,
              textAlign: column.align ?? "left",
              cursor: sortable ? "pointer" : "default",
              userSelect: "none",
              "&:hover": sortable ? { bgcolor: (t) => t.vars.palette.action.hover } : undefined,
            }}
          >
            <Text variant="overline" color="text.secondary">
              {column.header}
              {isActive ? (activeSort.direction === "asc" ? " ↑" : " ↓") : ""}
            </Text>
          </Box>
        );
      })}
    </Box>
  );

  if (sortedRows.length === 0) {
    return (
      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
        {headerRow}
        <Box sx={{ p: 3 }}>
          {typeof emptyMessage === "string" ? <Text>{emptyMessage}</Text> : emptyMessage}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
      <Box
        ref={parentRef}
        role="grid"
        aria-label={ariaLabel}
        aria-rowcount={sortedRows.length}
        sx={{ maxHeight, overflow: "auto" }}
      >
        {headerRow}
        <Box sx={{ position: "relative", height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = sortedRows[virtualRow.index];
            if (row === undefined) return null;
            return (
              <Box
                key={getRowId(row)}
                role="row"
                aria-rowindex={virtualRow.index + 1}
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: virtualRow.size,
                  transform: `translateY(${String(virtualRow.start)}px)`,
                  display: "grid",
                  gridTemplateColumns,
                  alignItems: "center",
                  borderBottom: 1,
                  borderColor: "divider",
                  "&:hover": { bgcolor: (t) => t.vars.palette.action.hover },
                }}
              >
                {columns.map((column) => (
                  <Box
                    key={column.key}
                    role="gridcell"
                    sx={{ px: 2, py: 1, textAlign: column.align ?? "left", minWidth: 0 }}
                  >
                    {column.render(row)}
                  </Box>
                ))}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
