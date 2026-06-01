import fs from "node:fs";
import path from "node:path";

const REQUIRED_KEYS = ["name", "description"];

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const data = {};
  for (const line of text.slice(3, end).split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].trim();
  }
  return data;
}

function targets(root) {
  const out = [];
  const agentsDir = path.join(root, ".claude/agents");
  if (fs.existsSync(agentsDir)) {
    for (const e of fs.readdirSync(agentsDir)) {
      if (e.endsWith(".md") && e !== "INDEX.md") out.push(`.claude/agents/${e}`);
    }
  }
  const skillsDir = path.join(root, ".claude/skills");
  if (fs.existsSync(skillsDir)) {
    for (const e of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, "SKILL.md"))) {
        out.push(`.claude/skills/${e.name}/SKILL.md`);
      }
    }
  }
  return out;
}

/**
 * Every agent and SKILL.md must carry YAML frontmatter with `name` + `description`
 * so the harness (and the indexes) can discover and describe them.
 */
export function frontmatter({ root }) {
  const violations = [];
  for (const file of targets(root)) {
    const fm = parseFrontmatter(fs.readFileSync(path.join(root, file), "utf8"));
    if (!fm) {
      violations.push({ file, line: 1, msg: "missing YAML frontmatter block" });
      continue;
    }
    for (const key of REQUIRED_KEYS) {
      if (!fm[key]) violations.push({ file, line: 1, msg: `frontmatter missing/empty key: ${key}` });
    }
  }
  return violations;
}
