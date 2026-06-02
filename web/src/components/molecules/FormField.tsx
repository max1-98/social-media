import type { ChangeEvent, ReactElement } from "react";

import { Input } from "../atoms";

/**
 * Molecule: a labelled text input with accessible error/helper text. Wraps the
 * `Input` atom and wires MUI's built-in label + helper-text association, so the
 * field is reachable by its accessible name and the error is announced.
 *
 * Boundaries: molecules import atoms/types only — never the `api` layer. The
 * owning page holds state and passes `value`/`onChange`/`error` down as props.
 */
export interface FormFieldProps {
  /** Accessible label for the field. */
  label: string;
  /** Field name (used for the input `name` + autofill). */
  name: string;
  /** Controlled value. */
  value: string;
  /** Change handler receiving the new string value. */
  onChange: (value: string) => void;
  /** HTML input type (e.g. `text`, `email`, `date`). Defaults to `text`. */
  type?: string;
  /** Error message; when set the field renders in its error state. */
  error?: string | null;
  /** Helper text shown when there is no error. */
  helperText?: string;
  /** Autocomplete token forwarded to the input. */
  autoComplete?: string;
  /** Marks the field as required. */
  required?: boolean;
}

export function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  error = null,
  helperText,
  autoComplete,
  required = false,
}: FormFieldProps): ReactElement {
  const hasError = error !== null && error !== "";
  return (
    <Input
      label={label}
      name={name}
      type={type}
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
      {...(type === "date" ? { slotProps: { inputLabel: { shrink: true } } } : {})}
    />
  );
}
