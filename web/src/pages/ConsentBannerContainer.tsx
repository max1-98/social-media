import type { ReactElement } from "react";

import { ConsentBanner } from "../components/organisms";
import { useConsent } from "../hooks";

/**
 * Connects the presentational {@link ConsentBanner} organism to
 * {@link useConsent}. Lives in the pages layer because only pages may import
 * both `organisms` and `hooks` (Atomic Design boundaries). The orchestrator
 * (`App.tsx`) drops this into `PageLayout`'s `consentBanner` slot, under a
 * `ConsentProvider`.
 *
 * Shows the banner only while no choice exists (`state === "unknown"`); the
 * `accept`/`refuse` actions handle Consent Mode v2 + `consent_log` logging.
 */
export function ConsentBannerContainer(): ReactElement {
  const { state, accept, refuse } = useConsent();
  return <ConsentBanner open={state === "unknown"} onAccept={accept} onRefuse={refuse} />;
}
