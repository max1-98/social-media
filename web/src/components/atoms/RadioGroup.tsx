import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import MuiRadio from "@mui/material/Radio";
import MuiRadioGroup from "@mui/material/RadioGroup";
import type { ReactElement } from "react";

/** A single radio choice. */
export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  /** Accessible name for the group (rendered as a `FormLabel`). */
  label: string;
  /** The selectable choices. */
  options: RadioOption[];
  /** The currently selected value. */
  value: string;
  /** Called with the newly selected value. */
  onChange: (value: string) => void;
  /** Lay the radios out in a row instead of a column. */
  row?: boolean;
}

/**
 * Atom: a labelled radio group built on MUI's `RadioGroup`. Mirrors the `Select`
 * atom's typed `options` API but renders mutually-exclusive radios with the group
 * label exposed via `FormLabel` for accessibility.
 */
export function RadioGroup({
  label,
  options,
  value,
  onChange,
  row = false,
}: RadioGroupProps): ReactElement {
  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <MuiRadioGroup
        row={row}
        value={value}
        onChange={(_event, next) => {
          onChange(next);
        }}
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<MuiRadio />}
            label={option.label}
          />
        ))}
      </MuiRadioGroup>
    </FormControl>
  );
}
