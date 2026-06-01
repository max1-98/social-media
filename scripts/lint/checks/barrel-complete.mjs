import fs from "node:fs";
import path from "node:path";

const LAYERS = [
  "web/src/components/atoms",
  "web/src/components/molecules",
  "web/src/components/organisms",
  "web/src/components/templates",
  "web/src/pages",
  "web/src/hooks",
  "web/src/contexts",
  "web/src/types",
  "web/src/api",
];

/**
 * ESLint `boundaries/entry-point` forces *consumers* to import a layer through its
 * barrel; this check guarantees the barrel is *complete* — every non-test module in
 * a layer dir is re-exported from that dir's index.ts (no orphaned modules).
 */
export function barrelComplete({ root }) {
  const violations = [];
  for (const layer of LAYERS) {
    const abs = path.join(root, layer);
    if (!fs.existsSync(abs)) continue;
    const modules = fs
      .readdirSync(abs, { withFileTypes: true })
      .filter(
        (e) =>
          e.isFile() &&
          /\.(ts|tsx)$/.test(e.name) &&
          e.name !== "index.ts" &&
          !e.name.endsWith(".d.ts") &&
          !/\.test\.(ts|tsx)$/.test(e.name),
      )
      .map((e) => e.name);
    if (modules.length === 0) continue;

    const indexFile = `${layer}/index.ts`;
    if (!fs.existsSync(path.join(abs, "index.ts"))) {
      violations.push({ file: indexFile, line: 1, msg: `missing barrel for ${modules.length} module(s)` });
      continue;
    }
    const idx = fs.readFileSync(path.join(abs, "index.ts"), "utf8");
    for (const mod of modules) {
      const base = mod.replace(/\.(ts|tsx)$/, "");
      const re = new RegExp(`from\\s+["']\\./${base}(\\.tsx?|\\.js)?["']`);
      if (!re.test(idx)) {
        violations.push({ file: indexFile, line: 1, msg: `${mod} is not re-exported from the barrel` });
      }
    }
  }
  return violations;
}
