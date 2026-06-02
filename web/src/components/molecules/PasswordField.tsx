import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import { useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { Icon, Input } from "../atoms";

/**
 * Molecule: a password input with a show/hide toggle. Wraps the `Input` atom and
 * adds an accessible toggle button (labelled "Show password" / "Hide password")
 * that switches the field between `password` and `text`.
 *
 * Boundaries: molecules import atoms/types only — never the `api` layer.
 */
export interface PasswordFieldProps {
  /** Accessible label for the field. */
  label: string;
  /** Field name (used for the input `name` + autofill). */
  name: string;
  /** Controlled value. */
  value: string;
  /** Change handler receiving the new string value. */
  onChange: (value: string) => void;
  /** Error message; when set the field renders in its error state. */
  error?: string | null;
  /** Helper text shown when there is no error. */
  helperText?: string;
  /** Autocomplete token (e.g. `current-password`, `new-password`). */
  autoComplete?: string;
  /** Marks the field as required. */
  required?: boolean;
}

export function PasswordField({
  label,
  name,
  value,
  onChange,
  error = null,
  helperText,
  autoComplete,
  required = false,
}: PasswordFieldProps): ReactElement {
  const [visible, setVisible] = useState(false);
  const hasError = error !== null && error !== "";
  const toggleLabel = visible ? "Hide password" : "Show password";

  return (
    <Input
      label={label}
      name={name}
      type={visible ? "text" : "password"}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.value);
      }}
      error={hasError}
      helperText={hasError ? error : helperText}
      fullWidth
      margin="normal"
      required={required}
      {...(autoComplete === undefined ? {} : { autoComplete })}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={toggleLabel}
                onClick={() => {
                  setVisible((prev) => !prev);
                }}
                edge="end"
              >
                <Icon as={visible ? VisibilityOff : Visibility} fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
