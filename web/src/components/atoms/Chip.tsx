import MuiChip from "@mui/material/Chip";
import type { ChipProps as MuiChipProps } from "@mui/material/Chip";
import type { ReactElement } from "react";

/**
 * Atom: a compact pill wrapping MUI `Chip` — used for counts and the ELO score
 * pill. Accepts the augmented palette keys (e.g. `color="energy"`).
 */
export type ChipProps = MuiChipProps;

export function Chip(props: ChipProps): ReactElement {
  return <MuiChip {...props} />;
}
