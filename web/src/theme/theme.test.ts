import { describe, expect, it } from "vitest";

import { theme } from "./theme";

// WCAG 2.x relative-luminance contrast ratio between two `#rrggbb` colours.
function contrast(a: string, b: string): number {
  const lum = (hex: string): number => {
    const n = parseInt(hex.replace("#", ""), 16);
    const chan = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("theme", () => {
  it('defines the "Court Side" light and dark colour schemes', () => {
    expect(theme.colorSchemes.light?.palette.primary.main).toBe("#0f766e");
    expect(theme.colorSchemes.dark?.palette.primary.main).toBe("#2dd4bf");
    expect(theme.colorSchemes.light?.palette.background.default).toBe("#f8fafc");
    expect(theme.colorSchemes.dark?.palette.background.default).toBe("#0b1117");
  });

  it("exposes an energy accent token in both schemes", () => {
    expect(theme.colorSchemes.light?.palette.energy.main).toBe("#f59e0b");
    expect(theme.colorSchemes.dark?.palette.energy.main).toBe("#fbbf24");
  });

  it("clears WCAG AA contrast in both schemes", () => {
    for (const scheme of ["light", "dark"] as const) {
      const p = theme.colorSchemes[scheme]?.palette;
      if (!p) throw new Error(`missing ${scheme} scheme`);
      expect(contrast(p.primary.main, p.primary.contrastText)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.text.secondary, p.background.paper)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("uses Sora for display headings and Inter for body", () => {
    expect(theme.typography.h1.fontFamily).toContain("Sora");
    expect(theme.typography.fontFamily).toContain("Inter");
  });

  it("drives colour via CSS variables and a rounded shape", () => {
    expect(theme.cssVariables).not.toBe(false);
    expect(theme.shape.borderRadius).toBe(12);
  });

  it("disables button uppercasing", () => {
    expect(theme.typography.button.textTransform).toBe("none");
  });
});
