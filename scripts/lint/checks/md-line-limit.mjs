import fs from "node:fs";
import path from "node:path";

export const MD_LINE_LIMIT = 150;

/**
 * Every Markdown file must stay under MD_LINE_LIMIT lines so docs stay scannable
 * and Claude context stays cheap. Operates on the provided file list (tracked
 * files in repo mode, the edited file in --changed mode).
 */
export function mdLineLimit({ root, files }) {
  const violations = [];
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    let text;
    try {
      text = fs.readFileSync(path.join(root, file), "utf8");
    } catch {
      continue;
    }
    const count = text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
    if (count > MD_LINE_LIMIT) {
      violations.push({
        file,
        line: MD_LINE_LIMIT + 1,
        msg: `${count} lines (limit ${MD_LINE_LIMIT}). Split it (see the split-markdown skill).`,
      });
    }
  }
  return violations;
}
