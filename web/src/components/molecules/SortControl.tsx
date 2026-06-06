import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import type { ReactElement } from "react";

import { Icon, Select } from "../atoms";
import type { SelectOption } from "../atoms";

/** Ascending or descending sort direction. */
export type SortDirection = "asc" | "desc";

export interface SortControlProps {
  /** The currently selected sort key (one of `options`' values). */
  sortKey: string;
  /** The current sort direction. */
  direction: SortDirection;
  /** The selectable sort keys. */
  options: SelectOption[];
  /** Accessible label for the key dropdown (default "Sort by"). */
  label?: string;
  /** Invoked with the raw selected key; the parent narrows it to its own type. */
  onSortKeyChange: (key: string) => void;
  /** Toggle between ascending and descending. */
  onDirectionToggle: () => void;
}

/**
 * Molecule: a controlled sort control — a key dropdown plus a direction toggle.
 * Presentational only; the parent owns the sort state and comparator. Reusable
 * for any list that sorts by a small set of named keys.
 */
export function SortControl({
  sortKey,
  direction,
  options,
  label = "Sort by",
  onSortKeyChange,
  onDirectionToggle,
}: SortControlProps): ReactElement {
  const ascending = direction === "asc";
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Select
        label={label}
        options={options}
        value={sortKey}
        onChange={(e) => {
          onSortKeyChange(e.target.value);
        }}
        sx={{ minWidth: 120 }}
      />
      <IconButton
        size="small"
        aria-label={
          ascending
            ? "Sort ascending; switch to descending"
            : "Sort descending; switch to ascending"
        }
        onClick={onDirectionToggle}
      >
        <Icon as={ascending ? ArrowUpwardIcon : ArrowDownwardIcon} fontSize="small" />
      </IconButton>
    </Stack>
  );
}
