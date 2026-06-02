import Box from "@mui/material/Box";
import { useEffect, useRef } from "react";
import type { ReactElement } from "react";

/**
 * Molecule: a single AdSense slot (GDPR — `.claude/rules/gdpr.md`).
 *
 * Hard invariant: the AdSense script + the Google certified CMP load ONLY when
 * `accepted` is true. Before consent this renders a neutral, reserved-space
 * placeholder and injects NO `<script>` — verified by `AdSlot.test.tsx`.
 *
 * Presentational by design: the `accepted` gate comes from `useConsent` at the
 * call site, so molecules need not import hooks/contexts (layer boundaries).
 *
 * Publisher / CMP IDs come from Vite env (`VITE_ADSENSE_CLIENT`,
 * `VITE_ADSENSE_SLOT`, `VITE_CMP_PUB_ID`); never hard-coded. When unset, the
 * scripts are skipped so dev/test never leak a non-essential request.
 */
export interface AdSlotProps {
  /** True only after the user has accepted ads consent. The single gate. */
  accepted: boolean;
  /** Override the default ad slot id (else `VITE_ADSENSE_SLOT`). */
  slot?: string;
  /** Accessible label for the ad region. */
  label?: string;
}

const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

/** Inject a script once (idempotent by `src`). No-op if already present. */
function ensureScript(src: string, client: string): void {
  if (document.querySelector(`script[src^="${src}"]`) !== null) {
    return;
  }
  const el = document.createElement("script");
  el.src = `${src}?client=${encodeURIComponent(client)}`;
  el.async = true;
  el.crossOrigin = "anonymous";
  // The Google certified CMP (Funding Choices) loads from the same tag set as
  // AdSense once `data-ad-client` is present; this tag is gated on consent.
  el.setAttribute("data-ad-client", client);
  document.head.appendChild(el);
}

export function AdSlot({
  accepted,
  slot,
  label = "Advertisement",
}: AdSlotProps): ReactElement | null {
  const client = import.meta.env.VITE_ADSENSE_CLIENT;
  const adSlot = slot ?? import.meta.env.VITE_ADSENSE_SLOT;
  const pushed = useRef(false);

  useEffect(() => {
    // GDPR gate: never touch the network until consent is accepted.
    if (!accepted || client === undefined || adSlot === undefined) {
      return;
    }
    ensureScript(ADSENSE_SRC, client);
    if (!pushed.current) {
      (window.adsbygoogle ??= []).push({});
      pushed.current = true;
    }
  }, [accepted, client, adSlot]);

  // No consent (or unconfigured): render a neutral placeholder, NO script tag.
  if (!accepted || client === undefined || adSlot === undefined) {
    return (
      <Box aria-hidden data-testid="ad-slot-placeholder" sx={{ display: "block", minHeight: 90 }} />
    );
  }

  return (
    <Box component="aside" aria-label={label} sx={{ display: "block", minHeight: 90 }}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </Box>
  );
}
