/**
 * `useConsent` — read the consent state + actions from {@link ConsentContext}.
 * Throws if used outside a `ConsentProvider` so misuse fails loudly in dev.
 *
 * Boundaries: hooks may import `api`, `hooks`, `contexts`, `types` only.
 */

import { useContext } from "react";

import { ConsentContext } from "../contexts";
import type { ConsentContextValue } from "../contexts";

/** Access the consent context; must be rendered under a `ConsentProvider`. */
export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (ctx === null) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return ctx;
}
