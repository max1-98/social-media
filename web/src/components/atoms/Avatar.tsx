import MuiAvatar from "@mui/material/Avatar";
import type { AvatarProps as MuiAvatarProps } from "@mui/material/Avatar";
import type { ReactElement } from "react";

/**
 * Atom: a user/club avatar wrapping MUI `Avatar`. Always pass `alt` when using
 * an image `src` so the avatar has an accessible name.
 */
export type AvatarProps = MuiAvatarProps;

export function Avatar(props: AvatarProps): ReactElement {
  return <MuiAvatar {...props} />;
}
