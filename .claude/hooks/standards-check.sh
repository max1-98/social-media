#!/usr/bin/env bash
# Stop hook: run the custom repo linter at the end of every turn so the full
# standards bar (md<150, index-sync, frontmatter, barrels) is checked each session.
# Advisory: prints violations to the transcript but never blocks (always exit 0).
DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
node "$DIR/scripts/lint/repo-lint.mjs" >&2 || true
exit 0
