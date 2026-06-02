import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdSlot } from "./AdSlot.tsx";

/** Count AdSense/CMP-related script tags currently in the document. */
function adScriptCount(): number {
  return document.querySelectorAll(
    'script[src*="adsbygoogle"], script[src*="googlesyndication"], script[src*="fundingchoices"]',
  ).length;
}

describe("AdSlot molecule", () => {
  beforeEach(() => {
    // Provide IDs so the only thing gating the script is consent, not config.
    vi.stubEnv("VITE_ADSENSE_CLIENT", "ca-pub-0000000000000000");
    vi.stubEnv("VITE_ADSENSE_SLOT", "1234567890");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    document.head.querySelectorAll("script").forEach((s) => {
      s.remove();
    });
  });

  it("loads NO ad/adsbygoogle script before consent (key GDPR assertion)", () => {
    render(<AdSlot accepted={false} />);
    // No ad <ins> rendered, only a neutral placeholder.
    expect(screen.queryByLabelText("Advertisement")).not.toBeInTheDocument();
    expect(screen.getByTestId("ad-slot-placeholder")).toBeInTheDocument();
    // The hard invariant: no AdSense/CMP script tag exists pre-consent.
    expect(adScriptCount()).toBe(0);
  });

  it("renders the ad region and injects the AdSense script after consent", () => {
    window.adsbygoogle = [];
    render(<AdSlot accepted />);
    expect(screen.getByRole("complementary", { name: "Advertisement" })).toBeInTheDocument();
    expect(adScriptCount()).toBe(1);
  });
});
