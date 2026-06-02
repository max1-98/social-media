import { describe, expect, it } from "vitest";

import { theme } from "./theme";

describe("theme", () => {
  it("builds a light theme with the design tokens", () => {
    expect(theme.palette.mode).toBe("light");
    expect(theme.palette.primary.main).toBe("#3949ab");
    expect(theme.palette.background.default).toBe("#f6f7f9");
  });

  it("uses an 8px spacing unit and rounded shape", () => {
    expect(theme.spacing(3)).toBe("24px");
    expect(theme.shape.borderRadius).toBe(10);
  });

  it("disables button uppercasing", () => {
    expect(theme.typography.button.textTransform).toBe("none");
  });
});
