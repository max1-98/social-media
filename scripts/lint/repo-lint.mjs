#!/usr/bin/env node
// Custom repo linter — enforces standards the language tools (clippy/eslint) can't:
//   - every Markdown file < 150 lines
//   - each .claude/*/INDEX.md in sync with its directory
//   - agents/skills carry required frontmatter
//   - every atomic-design layer has a complete barrel (index.ts)
// Zero dependencies; runs identically in CI, the Stop hook, and the .md PostToolUse
// hook. Excludes legacy backend/ + frontend/ (removed at cutover).
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { mdLineLimit } from "./checks/md-line-limit.mjs";
import { indexSync } from "./checks/index-sync.mjs";
import { frontmatter } from "./checks/frontmatter.mjs";
import { barrelComplete } from "./checks/barrel-complete.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const IGNORE = ["backend/", "frontend/", "node_modules/", "target/", "dist/", "coverage/"];

function trackedFiles() {
  // Tracked + untracked-but-not-gitignored, so a new (uncommitted) long .md is
  // caught before it is committed. Gitignored trees (node_modules/target/dist)
  // are excluded automatically; legacy backend/frontend are excluded explicitly.
  const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8",
  });
  return out
    .split("\n")
    .filter(Boolean)
    .filter((f) => !IGNORE.some((p) => f.startsWith(p)));
}

const argv = process.argv.slice(2);
const changedMode = argv[0] === "--changed";

// In --changed mode (PostToolUse on a single edit) only the per-file Markdown rule
// applies; the structural checks (index/frontmatter/barrel) are whole-repo.
const files = changedMode
  ? argv.slice(1).map((f) => path.relative(root, path.resolve(f)))
  : trackedFiles();
const checks = changedMode
  ? [mdLineLimit]
  : [mdLineLimit, indexSync, frontmatter, barrelComplete];

const ctx = { root, files };
const violations = checks.flatMap((check) => check(ctx));

if (violations.length === 0) {
  if (!changedMode) console.log("repo-lint: all checks passed ✓");
  process.exit(0);
}

const byFile = new Map();
for (const v of violations) {
  if (!byFile.has(v.file)) byFile.set(v.file, []);
  byFile.get(v.file).push(v);
}
console.error(`repo-lint: ${String(violations.length)} violation(s)\n`);
for (const [file, vs] of byFile) {
  console.error(file);
  for (const v of vs) console.error(`  ${String(v.line)}: ${v.msg}`);
}
process.exit(1);
