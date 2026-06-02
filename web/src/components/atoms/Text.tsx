import Typography from "@mui/material/Typography";
import type { TypographyProps } from "@mui/material/Typography";
import type { ReactElement } from "react";

/**
 * Atom: typographic text wrapping MUI `Typography`. Use the `variant` prop for
 * semantic headings (e.g. `variant="h1"`) so the right element/role is emitted.
 */
export type TextProps = TypographyProps;

export function Text(props: TextProps): ReactElement {
  return <Typography {...props} />;
}
