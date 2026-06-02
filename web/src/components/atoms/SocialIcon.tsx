import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LanguageIcon from "@mui/icons-material/Language";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { ComponentType, ReactElement } from "react";

import { Icon } from "./Icon";

/**
 * Atom: render a social platform's glyph, mirroring the legacy `SocialIcon`
 * (facebook, whatsapp, instagram, website). Wraps the shared `Icon` atom so it
 * inherits MUI sizing/colour props and accessible-name handling via
 * `titleAccess`.
 */
export type SocialPlatform = "facebook" | "whatsapp" | "instagram" | "website";

export interface SocialIconProps extends SvgIconProps {
  /** Which social platform glyph to render. */
  platform: SocialPlatform;
}

const PLATFORM_ICONS: Record<SocialPlatform, ComponentType<SvgIconProps>> = {
  facebook: FacebookIcon,
  whatsapp: WhatsAppIcon,
  instagram: InstagramIcon,
  website: LanguageIcon,
};

export function SocialIcon({ platform, ...props }: SocialIconProps): ReactElement {
  return <Icon as={PLATFORM_ICONS[platform]} {...props} />;
}
