/**
 * Consent context (GDPR — `.claude/rules/gdpr.md`). Single source of truth for
 * the user's non-essential-cookie / ads choice.
 *
 * Invariants enforced here:
 *  - NO non-essential cookie or ad script loads before consent. The AdSense
 *    script + the Google certified CMP are injected by JS ONLY after `accept()`.
 *  - Consent Mode v2 defaults to `denied` (set in `index.html`); `accept()`
 *    pushes `gtag("consent", "update", …)` to grant before ads may load.
 *  - Every choice is mirrored to `consent_log` via `consentApi`.
 *
 * Persistence is essential-only: a first-party flag in `localStorage` (no
 * tracking), so the banner does not reappear on every visit.
 *
 * Boundaries: contexts may import `api`, `hooks`, `contexts`, `types` only.
 */

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { consentApi } from "../api";

/** Tri-state: no choice yet (banner shows), accepted, or refused. */
export type ConsentState = "unknown" | "accepted" | "refused";

/** First-party, non-tracking flag recording the essential-only choice. */
const STORAGE_KEY = "ss_consent_ads";

/** The shape consumers read via `useConsent`. */
export interface ConsentContextValue {
  /** Current ads/non-essential-cookie consent state. */
  state: ConsentState;
  /** True once consent is `accepted` — the only gate that may load ads. */
  adsAllowed: boolean;
  /** Accept ads: update Consent Mode v2 → grant, log choice, allow ad loading. */
  accept: () => Promise<void>;
  /** Refuse ads: keep Consent Mode v2 denied (non-personalised), log choice. */
  refuse: () => Promise<void>;
}

/** Internal context object; consume it through the `useConsent` hook. */
export const ConsentContext = createContext<ConsentContextValue | null>(null);

/** Read the persisted essential-only choice (safe on first paint / SSR). */
function readStored(): ConsentState {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "accepted" || v === "refused") {
      return v;
    }
  } catch {
    // localStorage unavailable (privacy mode): treat as no prior choice.
  }
  return "unknown";
}

/** Push a Consent Mode v2 update for every ad/analytics signal. */
function updateConsentMode(granted: boolean): void {
  const value = granted ? "granted" : "denied";
  window.gtag?.("consent", "update", {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  });
}

export interface ConsentProviderProps {
  children: ReactNode;
}

/** Provides consent state + actions to the tree. */
export function ConsentProvider({ children }: ConsentProviderProps): ReactElement {
  const [state, setState] = useState<ConsentState>("unknown");

  // Re-apply a prior choice on mount: re-grant Consent Mode v2 if accepted.
  useEffect(() => {
    const stored = readStored();
    setState(stored);
    if (stored === "accepted") {
      updateConsentMode(true);
    }
  }, []);

  const persist = useCallback((next: Exclude<ConsentState, "unknown">) => {
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best-effort: if we cannot persist, the banner reappears — fail safe.
    }
  }, []);

  const accept = useCallback(async (): Promise<void> => {
    // 1) Consent Mode v2 → grant BEFORE any ad script is permitted to load.
    updateConsentMode(true);
    // 2) Record the choice in `consent_log`.
    await consentApi.logConsent({ consent_type: "ads", choice: "accept" });
    // 3) Only now flip local state, which is the single gate `AdSlot` reads.
    persist("accepted");
  }, [persist]);

  const refuse = useCallback(async (): Promise<void> => {
    // Keep Consent Mode v2 denied → non-personalised, no ad cookies.
    updateConsentMode(false);
    await consentApi.logConsent({ consent_type: "ads", choice: "refuse" });
    persist("refused");
  }, [persist]);

  const value = useMemo<ConsentContextValue>(
    () => ({ state, adsAllowed: state === "accepted", accept, refuse }),
    [state, accept, refuse],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}
