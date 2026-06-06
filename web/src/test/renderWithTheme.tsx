import { ThemeProvider } from "@mui/material/styles";
import {
  act,
  fireEvent,
  render as rtlRender,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { RenderOptions, RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { theme } from "../theme";

/**
 * Drop-in replacement for React Testing Library's `render` that wraps the tree
 * in the app's MUI ThemeProvider, so theme tokens and `theme.vars` (CSS
 * variables) resolve during tests. Pinned to the light scheme for determinism
 * (jsdom has no real `prefers-color-scheme`). Re-exports the RTL helpers tests
 * use, so a test only needs to swap its import source.
 */
function Wrapper({ children }: { children: ReactNode }): ReactElement {
  return (
    <ThemeProvider theme={theme} defaultMode="light">
      {children}
    </ThemeProvider>
  );
}

function render(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">): RenderResult {
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

export { act, fireEvent, render, screen, waitFor, within };
/** Explicit alias for callers that prefer the descriptive name. */
export const renderWithTheme = render;
