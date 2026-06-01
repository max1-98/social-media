# Hooks Index

Claude Code hooks, wired in `.claude/settings.json`.

- @.claude/hooks/session-start.sh — SessionStart: toolchain check, `npm ci`,
  `cargo fetch` so a fresh container can build/lint/test.
- @.claude/hooks/md-line-check.mjs — PostToolUse (Edit/Write/MultiEdit): blocks if
  an edited `.md` exceeds 150 lines, telling Claude to split it.
- @.claude/hooks/standards-check.sh — Stop: runs the custom repo linter at the end
  of every turn (advisory; prints violations, never blocks).
