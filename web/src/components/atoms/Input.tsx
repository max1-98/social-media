import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";
import type { ReactElement } from "react";

/**
 * Atom: a single-line text input wrapping MUI `TextField`. Always pass a `label`
 * (or `aria-label`) so the field is reachable by accessible name.
 */
export type InputProps = TextFieldProps;

export function Input(props: InputProps): ReactElement {
  return <TextField variant="outlined" size="small" {...props} />;
}
