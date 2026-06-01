---
name: run-standards
description: Use to run the full local standards bar before committing — Rust fmt/clippy/test, web lint/format/typecheck/test/build, and the custom repo linter.
---

# run-standards

Run everything CI runs, locally, before you commit. See `.claude/rules/commits.md`.

## Commands

```bash
# Rust (server/)
cd server && cargo fmt --check \
  && cargo clippy --all-targets -- -D warnings \
  && cargo test
cd ..

# Web (web/)
cd web && npm run lint \
  && npm run format:check \
  && npm run typecheck \
  && npm test \
  && npm run build
cd ..

# Custom repo standards (md<150, index-sync, frontmatter, barrels)
node scripts/lint/repo-lint.mjs
```

## Notes

- Auto-fix where possible: `cargo fmt`, `npm run lint:fix`, `npm run format`.
- The Stop hook runs `repo-lint` automatically at the end of each session; this
  skill is for running the complete bar on demand.

## Done when

Every command exits 0.
