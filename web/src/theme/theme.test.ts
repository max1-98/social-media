import { describe, expect, it } from "vitest";

import { theme } from "./theme";

describe("theme", () => {
  it("defines vibrant light and dark colour schemes", () => {
    expect(theme.colorSchemes.light?.palette.primary.main).toBe("#4338ca");
    expect(theme.colorSchemes.dark?.palette.primary.main).toBe("#818cf8");
    expect(theme.colorSchemes.light?.palette.background.default).toBe("#f5f6fb");
    expect(theme.colorSchemes.dark?.palette.background.default).toBe("#0b0d14");
  });

  it("exposes an energy accent token in both schemes", () => {
    expect(theme.colorSchemes.light?.palette.energy.main).toBe("#f59e0b");
    expect(theme.colorSchemes.dark?.palette.energy.main).toBe("#fbbf24");
  });

  it("drives colour via CSS variables and a rounded shape", () => {
    expect(theme.cssVariables).not.toBe(false);
    expect(theme.shape.borderRadius).toBe(12);
  });

  it("disables button uppercasing", () => {
    expect(theme.typography.button.textTransform).toBe("none");
  });
});
