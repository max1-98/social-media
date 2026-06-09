import fs from "node:fs";
import path from "node:path";

const PAGES_BARREL = "web/src/pages/index.ts";
const APP = "web/src/App.tsx";

/**
 * Reachability: a page that isn't wired into the router is dead weight — the user
 * can never get to it. ESLint/`barrel-complete` prove a page is *exported*; this
 * check proves it is *routed*: every PascalCase component re-exported from the
 * pages barrel must be referenced in `App.tsx` (a `<Route>` element or the global
 * consent/render shell). Helper exports (camelCase, e.g. `pastGamesStats`) are
 * skipped. The complementary nav-link/button requirement (sidebar item or a link
 * from a parent page) is a documented DoD step — see `.claude/rules/atomic-design.md`.
 */
export function pageRouted({ root }) {
  const violations = [];
  const barrelAbs = path.join(root, PAGES_BARREL);
  const appAbs = path.join(root, APP);
  if (!fs.existsSync(barrelAbs) || !fs.existsSync(appAbs)) return violations;

  const barrel = fs.readFileSync(barrelAbs, "utf8");
  const app = fs.readFileSync(appAbs, "utf8");

  // Identifiers re-exported from a local page module (`export { X } from "./X"`).
  const names = new Set();
  const re = /export\s*\{([^}]*)\}\s*from\s*["']\.\/[^"']+["']/g;
  let m;
  while ((m = re.exec(barrel)) !== null) {
    for (const raw of m[1].split(",")) {
      const name = raw
        .trim()
        .split(/\s+as\s+/)
        .pop()
        .trim();
      // Only components (PascalCase); skip helper fns/consts.
      if (/^[A-Z]/.test(name)) names.add(name);
    }
  }

  for (const name of names) {
    if (!new RegExp(`\\b${name}\\b`).test(app)) {
      violations.push({
        file: PAGES_BARREL,
        line: 1,
        msg: `${name} is exported but never routed in App.tsx — every page must be reachable (add a <Route> + a nav link/button). See .claude/rules/atomic-design.md.`,
      });
    }
  }
  return violations;
}
