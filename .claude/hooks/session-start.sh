#!/usr/bin/env bash
# SessionStart hook: prepare a fresh container so a web session can build, lint,
# and test immediately. Idempotent; never blocks session start (always exit 0).
DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

command -v cargo >/dev/null 2>&1 || echo "session-start: WARN cargo not found" >&2
command -v node  >/dev/null 2>&1 || echo "session-start: WARN node not found" >&2

if [ -d "$DIR/web" ]; then
  ( cd "$DIR/web" && npm ci --no-audit --no-fund ) || echo "session-start: WARN npm ci failed" >&2
fi
if [ -d "$DIR/server" ]; then
  ( cd "$DIR/server" && cargo fetch ) || echo "session-start: WARN cargo fetch failed" >&2
fi

echo "session-start: ready"
exit 0
