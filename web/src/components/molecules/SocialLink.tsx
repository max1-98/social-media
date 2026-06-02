import type { ReactElement } from "react";

import type { Social } from "../../types";
import { Link, SocialIcon } from "../atoms";
import type { SocialPlatform } from "../atoms";

const KNOWN_PLATFORMS: readonly SocialPlatform[] = ["facebook", "whatsapp", "instagram", "website"];

function toPlatform(platform: string): SocialPlatform {
  const lower = platform.toLowerCase();
  return KNOWN_PLATFORMS.find((p) => p === lower) ?? "website";
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  website: "Website",
};

export interface SocialLinkProps {
  /** The social link to render (platform + url). */
  social: Social;
}

/**
 * Molecule: a club's social link as an accessible, icon-labelled anchor. Pairs
 * the {@link SocialIcon} atom with the platform name and opens the URL in a new
 * tab (with `rel="noopener"`). Unknown platforms fall back to the website glyph.
 */
export function SocialLink({ social }: SocialLinkProps): ReactElement {
  const platform = toPlatform(social.platform);
  const label = PLATFORM_LABELS[platform];

  return (
    <Link
      href={social.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
    >
      <SocialIcon platform={platform} fontSize="small" titleAccess={label} />
      {label}
    </Link>
  );
}
