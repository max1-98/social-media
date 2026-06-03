import MuiButton from "@mui/material/Button";
import type { ButtonProps as MuiButtonProps } from "@mui/material/Button";
import type { ReactElement } from "react";

/**
 * Atom: the lowest-level button primitive, wrapping MUI `Button` so it inherits
 * the app theme (primary colour, radius, typography). Defaults to the filled
 * `contained` variant; callers override `variant`/`color` as needed. Consumers
 * import it via the layer barrel (`../atoms`), never the deep path.
 */
export type ButtonProps = MuiButtonProps;

export function Button(props: ButtonProps): ReactElement {
  return <MuiButton variant="contained" {...props} />;
}
