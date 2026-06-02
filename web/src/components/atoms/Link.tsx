import MuiLink from "@mui/material/Link";
import type { LinkProps as MuiLinkProps } from "@mui/material/Link";
import type { ReactElement } from "react";

/**
 * Atom: a styled anchor wrapping MUI `Link`. For client-side navigation, pass
 * a router link component via the `component` prop at the call site.
 */
export type LinkProps = MuiLinkProps;

export function Link(props: LinkProps): ReactElement {
  return <MuiLink {...props} />;
}
