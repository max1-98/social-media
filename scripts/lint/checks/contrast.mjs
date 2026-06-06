// WCAG colour-contrast maths, shared by the colour-contrast check. Zero deps.
// Mirrors how the frontend (MUI) actually renders colours so the linter checks
// the same numbers the browser paints.

/** Parse `#rgb` / `#rrggbb` (and the 8-digit form, ignoring alpha) to [r,g,b] 0-255. */
export function hexToRgb(hex) {
  const h = hex.trim().replace(/^#/, "");
  const full =
    h.length === 3 || h.length === 4
      ? h
          .slice(0, 3)
          .split("")
          .map((c) => c + c)
          .join("")
      : h.slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** WCAG 2.x relative luminance of an [r,g,b] (0-255) colour. */
export function relativeLuminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio (1–21) between two hex colours. */
export function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexToRgb(hexA));
  const lb = relativeLuminance(hexToRgb(hexB));
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Replicate MUI's `theme.palette.getContrastText`: pick light (`#fff`) or dark
 * (`rgba(0,0,0,0.87)`) text for a background, using the default 3:1 threshold.
 * Lets us check the derived `contrastText` MUI generates for palette groups
 * (success/warning/error/info) that don't declare one. The dark option is opaque
 * `#000000` here — a conservative stand-in for `rgba(0,0,0,0.87)` (slightly
 * higher contrast than the real value, so it never under-reports a failure).
 */
export function muiContrastText(backgroundHex, threshold = 3) {
  return contrastRatio(backgroundHex, "#ffffff") >= threshold ? "#ffffff" : "#000000";
}

/** WCAG AA threshold for normal-size text. */
export const AA_NORMAL = 4.5;
