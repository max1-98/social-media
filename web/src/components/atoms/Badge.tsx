import MuiBadge from "@mui/material/Badge";
import type { BadgeProps as MuiBadgeProps } from "@mui/material/Badge";
import type { ReactElement } from "react";

/**
 * Atom: a count/status badge wrapping MUI `Badge` (e.g. pending member requests).
 */
export type BadgeProps = MuiBadgeProps;

export function Badge(props: BadgeProps): ReactElement {
  return <MuiBadge {...props} />;
}
