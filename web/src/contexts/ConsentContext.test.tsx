import { act, render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { useContext } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConsentContext, ConsentProvider } from "./ConsentContext.tsx";

const logConsent = vi.fn<(p: { consent_type: string; choice: string }) => Promise<unknown>>();

vi.mock("../api", () => ({
  consentApi: { logConsent: (p: { consent_type: string; choice: string }) => logConsent(p) },
}));

/** Tiny probe that surfaces the context value as buttons + text. */
function Probe(): React.ReactElement {
  const ctx = useContext(ConsentContext);
  if (ctx === null) {
    return <span>no provider</span>;
  }
  return (
    <div>
      <span data-testid="state">{ctx.state}</span>
      <span data-testid="ads">{String(ctx.adsAllowed)}</span>
      <button onClick={() => void ctx.accept()}>do-accept</button>
      <button onClick={() => void ctx.refuse()}>do-refuse</button>
    </div>
  );
}

describe("ConsentContext", () => {
  beforeEach(() => {
    logConsent.mockResolvedValue({});
    window.localStorage.clear();
    window.gtag = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts unknown with ads denied", () => {
    render(
      <ConsentProvider>
        <Probe />
      </ConsentProvider>,
    );
    expect(screen.getByTestId("state")).toHaveTextContent("unknown");
    expect(screen.getByTestId("ads")).toHaveTextContent("false");
  });

  it("accept(): pushes Consent Mode v2 grant, logs choice, then allows ads", async () => {
    render(
      <ConsentProvider>
        <Probe />
      </ConsentProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "do-accept" }));
    });
    await waitFor(() => {
      expect(screen.getByTestId("ads")).toHaveTextContent("true");
    });
    expect(window.gtag).toHaveBeenCalledWith(
      "consent",
      "update",
      expect.objectContaining({ ad_storage: "granted" }),
    );
    expect(logConsent).toHaveBeenCalledWith({ consent_type: "ads", choice: "accept" });
  });

  it("refuse(): keeps Consent Mode v2 denied and never allows ads", async () => {
    render(
      <ConsentProvider>
        <Probe />
      </ConsentProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "do-refuse" }));
    });
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("refused");
    });
    expect(screen.getByTestId("ads")).toHaveTextContent("false");
    expect(window.gtag).toHaveBeenCalledWith(
      "consent",
      "update",
      expect.objectContaining({ ad_storage: "denied" }),
    );
    expect(logConsent).toHaveBeenCalledWith({ consent_type: "ads", choice: "refuse" });
  });
});
