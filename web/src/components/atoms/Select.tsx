import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";
import type { ReactElement } from "react";

/** A single selectable option. */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Atom: a labelled dropdown built on MUI's `select` `TextField`. Pass `label`
 * for the accessible name and `options` for the choices. Using the `TextField`
 * `select` form keeps the label association handled for us.
 */
export type SelectProps = Omit<TextFieldProps, "select" | "children"> & {
  options: SelectOption[];
};

export function Select({ options, ...props }: SelectProps): ReactElement {
  return (
    <TextField select variant="outlined" size="small" {...props}>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
