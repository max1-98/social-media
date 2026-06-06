// Colour-contrast check: keeps the app readable as the palette evolves — no
// dark-on-dark / light-on-light text. Two parts:
//   1. Theme audit — every palette `main`/`contrastText` pair and every `text.*`
//      on `background.default`/`.paper` must clear WCAG AA (4.5:1) in BOTH the
//      light and dark schemes defined in `web/src/theme/theme.ts`.
//   2. Component scan — any component `sx` block that sets a foreground (`color`)
//      AND a background (`bgcolor`/`backgroundColor`) to resolvable theme tokens
//      is checked the same way; raw hex in components is flagged (use tokens).
// Static + zero-dependency: it resolves tokens to hex from the theme source, so
// it checks the numbers MUI actually paints. See the `theming` skill.
import fs from "node:fs";
import path from "node:path";

import { AA_NORMAL, contrastRatio, muiContrastText } from "./contrast.mjs";

const THEME = "web/src/theme/theme.ts";
const GROUPS = ["primary", "secondary", "energy", "success", "warning", "error", "info"];

// Pull the `light: { palette: {...} }` and `dark: { palette: {...} }` source out
// of the theme file, then the `group: { key: "#hex", ... }` literals within each.
function parseThemePalette(themeText) {
  const schemes = {};
  for (const name of ["light", "dark"]) {
    const start = themeText.indexOf(`${name}: {`);
    if (start === -1) continue;
    // Slice to the next scheme / end of colorSchemes — enough to contain the block.
    const rest = themeText.slice(start);
    const other = name === "light" ? "dark: {" : "shape:";
    const end = rest.indexOf(other);
    const block = end === -1 ? rest : rest.slice(0, end);
    const tokens = {};
    const groupRe = /(\w+):\s*\{([^}]*)\}/g;
    let m;
    while ((m = groupRe.exec(block)) !== null) {
      const group = m[1];
      const inner = m[2];
      const kvRe = /(\w+):\s*"(#[0-9a-fA-F]{3,8})"/g;
      let kv;
      while ((kv = kvRe.exec(inner)) !== null) {
        tokens[`${group}.${kv[1]}`] = kv[2];
      }
    }
    schemes[name] = tokens;
  }
  return schemes;
}

function lineOf(text, needle) {
  const idx = text.indexOf(needle);
  return idx === -1 ? 1 : text.slice(0, idx).split("\n").length;
}

// Resolve a foreground token (a `main` or a `contrastText`/explicit hue) for a
// scheme, deriving MUI's contrastText for groups that don't declare one.
function resolveGroupPair(tokens, group) {
  const main = tokens[`${group}.main`];
  if (!main) return null;
  const contrastText = tokens[`${group}.contrastText`] ?? muiContrastText(main);
  return { main, contrastText };
}

function auditTheme(root) {
  const violations = [];
  const themeText = fs.readFileSync(path.join(root, THEME), "utf8");
  const schemes = parseThemePalette(themeText);
  for (const [scheme, tokens] of Object.entries(schemes)) {
    for (const group of GROUPS) {
      const pair = resolveGroupPair(tokens, group);
      if (!pair) continue;
      const ratio = contrastRatio(pair.main, pair.contrastText);
      if (ratio < AA_NORMAL) {
        violations.push({
          file: THEME,
          line: lineOf(themeText, `${group}: {`),
          msg: `${scheme} ${group}.main on contrastText is ${ratio.toFixed(2)}:1 (< ${String(AA_NORMAL)} AA)`,
        });
      }
    }
    for (const tone of ["primary", "secondary"]) {
      const fg = tokens[`text.${tone}`];
      if (!fg) continue;
      for (const surface of ["default", "paper"]) {
        const bg = tokens[`background.${surface}`];
        if (!bg) continue;
        const ratio = contrastRatio(fg, bg);
        if (ratio < AA_NORMAL) {
          violations.push({
            file: THEME,
            line: lineOf(themeText, "text: {"),
            msg: `${scheme} text.${tone} on background.${surface} is ${ratio.toFixed(2)}:1 (< ${String(AA_NORMAL)} AA)`,
          });
        }
      }
    }
  }
  return { violations, schemes };
}

// Extract the body of every `sx={{ ... }}` block (brace-balanced) from a file,
// with the 1-based line where the block starts.
function sxBlocks(text) {
  const blocks = [];
  const marker = "sx={{";
  let i = text.indexOf(marker);
  while (i !== -1) {
    let depth = 0;
    let j = i + marker.length - 1; // sit on the first inner `{`
    const startLine = text.slice(0, i).split("\n").length;
    for (; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    blocks.push({ body: text.slice(i + marker.length, j), line: startLine });
    i = text.indexOf(marker, j);
  }
  return blocks;
}

// A token is resolvable if it's a plain dotted/bare palette token (no gradient,
// rgba, channel or callback). Returns the hex for a scheme, or null to skip.
function resolveToken(tokens, raw) {
  const v = raw.trim();
  if (!v || v.includes("(") || v.includes("$") || v === "transparent") return null;
  if (["inherit", "currentColor", "initial", "unset"].includes(v)) return null;
  const key = v.includes(".") ? v : `${v}.main`;
  return tokens[key] ?? null;
}

function scanComponents(root, files, schemes) {
  const violations = [];
  for (const file of files) {
    if (!file.endsWith(".tsx") || file.endsWith(".test.tsx")) continue;
    if (!/^web\/src\/(components|pages)\//.test(file)) continue;
    const text = fs.readFileSync(path.join(root, file), "utf8");

    // Guard: components must use tokens, never raw hex (see theming skill).
    const hexRe = /#[0-9a-fA-F]{3,8}\b/g;
    let h;
    while ((h = hexRe.exec(text)) !== null) {
      violations.push({
        file,
        line: text.slice(0, h.index).split("\n").length,
        msg: `hardcoded colour ${h[0]} — use a theme token (color="text.secondary" etc.)`,
      });
    }

    for (const { body, line } of sxBlocks(text)) {
      const fg = /(?:^|[\s,{])color:\s*"([^"]+)"/.exec(body);
      const bg = /(?:bgcolor|backgroundColor):\s*"([^"]+)"/.exec(body);
      if (!fg || !bg) continue;
      for (const [scheme, tokens] of Object.entries(schemes)) {
        const fgHex = resolveToken(tokens, fg[1]);
        const bgHex = resolveToken(tokens, bg[1]);
        if (!fgHex || !bgHex) continue;
        const ratio = contrastRatio(fgHex, bgHex);
        if (ratio < AA_NORMAL) {
          violations.push({
            file,
            line,
            msg: `${scheme}: color "${fg[1]}" on "${bg[1]}" is ${ratio.toFixed(2)}:1 (< ${String(AA_NORMAL)} AA)`,
          });
        }
      }
    }
  }
  return violations;
}

export function colorContrast({ root, files }) {
  const { violations, schemes } = auditTheme(root);
  return [...violations, ...scanComponents(root, files, schemes)];
}
