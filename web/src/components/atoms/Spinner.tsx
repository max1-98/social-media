import CircularProgress from "@mui/material/CircularProgress";
import type { CircularProgressProps } from "@mui/material/CircularProgress";
import type { ReactElement } from "react";

/**
 * Atom: a loading indicator wrapping MUI `CircularProgress`. Defaults to an
 * accessible `aria-label` of "Loading" so it is announced as a busy region.
 */
export type SpinnerProps = CircularProgressProps;

export function Spinner(props: SpinnerProps): ReactElement {
  return <CircularProgress aria-label="Loading" {...props} />;
}
