import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { ComponentType, ReactElement } from "react";

/**
 * Atom: render a MUI SVG icon. Pass the icon component via `as` (e.g. an import
 * from `@mui/icons-material`). Decorative by default; give a `titleAccess` for a
 * meaningful icon so it is announced to assistive tech.
 */
export interface IconProps extends SvgIconProps {
  /** The MUI icon component to render. */
  as: ComponentType<SvgIconProps>;
}

export function Icon({ as: Component, ...props }: IconProps): ReactElement {
  return <Component {...props} />;
}
