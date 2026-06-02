import MuiAlert from "@mui/material/Alert";
import type { AlertProps as MuiAlertProps } from "@mui/material/Alert";
import type { ReactElement } from "react";

/**
 * Atom: an inline status message wrapping MUI `Alert`. MUI renders the correct
 * `role` ("alert" for errors/warnings) so screen readers announce it.
 */
export type AlertProps = MuiAlertProps;

export function Alert(props: AlertProps): ReactElement {
  return <MuiAlert {...props} />;
}
