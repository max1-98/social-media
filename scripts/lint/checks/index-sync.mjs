import fs from "node:fs";
import path from "node:path";

const INDEXED_DIRS = [
  { dir: ".claude/rules", kind: "md" },
  { dir: ".claude/agents", kind: "md" },
  { dir: ".claude/skills", kind: "skill" },
  { dir: ".claude/hooks", kind: "hook" },
];

function actualEntries(root, dir, kind) {
  const abs = path.join(root, dir);
  const items = fs.readdirSync(abs, { withFileTypes: true });
  if (kind === "skill") {
    return items
      .filter((e) => e.isDirectory() && fs.existsSync(path.join(abs, e.name, "SKILL.md")))
      .map((e) => `${dir}/${e.name}/SKILL.md`);
  }
  const ext = kind === "hook" ? /\.(sh|mjs)$/ : /\.md$/;
  return items
    .filter((e) => e.isFile() && e.name !== "INDEX.md" && ext.test(e.name))
    .map((e) => `${dir}/${e.name}`);
}

function referencedPaths(root, dir) {
  const text = fs.readFileSync(path.join(root, dir, "INDEX.md"), "utf8");
  const refs = new Set();
  const re = /@([A-Za-z0-9._/-]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const p = m[1].replace(/^\.\//, "");
    if (p.startsWith(`${dir}/`)) refs.add(p);
  }
  return refs;
}

/**
 * Each `.claude/{rules,agents,skills,hooks}/INDEX.md` must @-reference exactly the
 * real entries in its directory — no missing entries, no stale links — so the
 * indexes stay a trustworthy discovery surface.
 */
export function indexSync({ root }) {
  const violations = [];
  for (const { dir, kind } of INDEXED_DIRS) {
    if (!fs.existsSync(path.join(root, dir))) continue;
    const indexFile = `${dir}/INDEX.md`;
    if (!fs.existsSync(path.join(root, indexFile))) {
      violations.push({ file: indexFile, line: 1, msg: `missing INDEX.md in ${dir}` });
      continue;
    }
    const refs = referencedPaths(root, dir);
    const actual = new Set(actualEntries(root, dir, kind));
    for (const a of actual) {
      if (!refs.has(a)) violations.push({ file: indexFile, line: 1, msg: `${a} exists but is not @-referenced` });
    }
    for (const r of refs) {
      if (!actual.has(r)) violations.push({ file: indexFile, line: 1, msg: `@${r} is referenced but missing on disk` });
    }
  }
  return violations;
}
