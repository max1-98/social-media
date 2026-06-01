# Markdown standards

## The 150-line rule

- **Every `.md` file must stay under 150 lines.** Enforced by the custom linter
  (`scripts/lint/repo-lint.mjs`), the `.md` PostToolUse hook, the Stop hook, and
  CI. Legacy `backend/` + `frontend/` are excluded (removed at cutover).
- When a doc approaches the limit, **split it** into linked sub-docs (see the
  `split-markdown` skill). Keep the parent as a short index with relative links.

## Keep docs lean

- One topic per file; link rather than duplicate.
- Prefer tables and tight lists over prose.

## Index files

- Each `.claude/{rules,agents,skills,hooks}/` dir has an `INDEX.md` that
  `@`-references exactly its entries — no missing, no stale. The `index-sync`
  check enforces this; update the index whenever you add/remove an entry.

## Frontmatter

- Every agent (`.claude/agents/*.md`) and skill (`.claude/skills/*/SKILL.md`) has
  YAML frontmatter with `name` and `description` (enforced by the linter).
