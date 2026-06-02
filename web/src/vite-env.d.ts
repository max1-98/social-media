/// <reference types="vite/client" />

/**
 * Typed Vite env vars (GDPR: ad/CMP IDs are config, never hard-coded — see
 * `.claude/rules/gdpr.md`). Document them in `web/.env.example`.
 */
interface ImportMetaEnv {
  /** AdSense publisher client, e.g. `ca-pub-XXXXXXXXXXXXXXXX`. */
  readonly VITE_ADSENSE_CLIENT?: string;
  /** Default ad slot id for `AdSlot` when none is passed, e.g. `1234567890`. */
  readonly VITE_ADSENSE_SLOT?: string;
  /**
   * Google certified CMP (Funding Choices / "Privacy & messaging") publisher id.
   * Loads the consent message script ONLY after the user accepts.
   */
  readonly VITE_CMP_PUB_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Google Consent Mode v2 `gtag` shim. The bootstrap in `index.html` defines
 * `window.dataLayer` + `gtag` and sets every consent type to `denied` by default;
 * `ConsentContext` calls `gtag("consent", "update", …)` only after a choice.
 */
interface Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  adsbygoogle?: unknown[];
}
