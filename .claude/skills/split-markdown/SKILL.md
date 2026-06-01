---
name: split-markdown
description: Use when a Markdown file approaches or exceeds the 150-line limit — split it into linked sub-documents and reduce the original to a short index.
---

# split-markdown

Keep every `.md` under 150 lines (see `.claude/rules/markdown.md`).

## Steps

1. Identify the natural sections (top-level headings) of the long file.
2. Create a sibling sub-directory (e.g. `docs/<topic>/`) and move each major
   section into its own file, numbered for order
   (`01-context.md`, `02-design.md`, …). Keep each well under 150 lines.
3. Add a short back-link at the top of each sub-doc:
   `> Part of the [Parent](../PARENT.md).`
4. Reduce the original file to an **index**: keep the title and a one-paragraph
   intro, then a "Document map" list with relative links to the sub-docs.
5. Preserve content faithfully — reorganise, don't drop information.
6. Verify: `node scripts/lint/repo-lint.mjs` (md-line-limit must pass). If the
   parent is itself indexed, the `.md` PostToolUse hook will confirm in-session.

## Done when

The original and every sub-doc are under 150 lines and cross-linked.
