import { vi } from "vitest";

import "@testing-library/jest-dom";

// jsdom has no matchMedia; MUI's ThemeProvider (defaultMode="system") and the
// colour-scheme system probe it. Provide a minimal, light-defaulting stub.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
}
