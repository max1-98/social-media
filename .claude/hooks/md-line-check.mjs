#!/usr/bin/env node
// PostToolUse hook: after an Edit/Write/MultiEdit, if the touched file is Markdown
// and now exceeds the 150-line limit, tell Claude to split it. Single source of
// truth — delegates to repo-lint --changed.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoLint = path.resolve(here, "../../scripts/lint/repo-lint.mjs");

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0);
}

const file = input?.tool_input?.file_path;
if (typeof file !== "string" || !file.endsWith(".md")) process.exit(0);

try {
  execFileSync("node", [repoLint, "--changed", file], { stdio: ["ignore", "pipe", "pipe"] });
  process.exit(0);
} catch (err) {
  const out = `${err.stdout?.toString() ?? ""}${err.stderr?.toString() ?? ""}`.trim();
  process.stderr.write(`${out || `Markdown file exceeds 150 lines: ${file}`}\n`);
  process.exit(2);
}
