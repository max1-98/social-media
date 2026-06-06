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

// jsdom has no ResizeObserver; `@tanstack/react-virtual` observes the scroll
// viewport with one. A no-op stub is enough — the virtualiser also measures on
// mount via offset sizes (stubbed below).
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe(): void {
      /* no-op */
    }
    unobserve(): void {
      /* no-op */
    }
    disconnect(): void {
      /* no-op */
    }
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
}

// jsdom reports every element's offset size as 0, so `@tanstack/react-virtual`
// (which measures the viewport via `offsetHeight`/`offsetWidth`) would render no
// rows. Report a fixed viewport so virtualised grids render a deterministic
// subset in tests.
for (const [prop, value] of [
  ["offsetHeight", 600],
  ["offsetWidth", 800],
] as const) {
  // jsdom defines these as getters that return 0; override them outright.
  Object.defineProperty(HTMLElement.prototype, prop, {
    configurable: true,
    get() {
      return value;
    },
  });
}
