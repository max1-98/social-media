# social-media — lightweight, GDPR-compliant sports social network (rebuild)

A parity rebuild of a Django + React app into a lean, predictably near-zero-cost
stack. Full plan: `docs/REBUILD_PLAN.md`.

## Repo map

- `server/` — Rust + Axum single binary (JSON API + static frontend + media proxy).
- `web/` — React + Vite + TypeScript, organised by **Atomic Design**.
- `deploy/` — production host config (systemd, Litestream→R2, Caddy); see the
  `deploy` skill and `docs/rebuild/05-deploy.md`.
- `scripts/lint/` — custom repo linter (md<150, index-sync, frontmatter, barrels,
  page-routed).
- `.claude/` — config, rules, agents, skills, hooks (each dir has an `INDEX.md`).

## Run the bar

- Rust: `cd server && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test`
- Web: `cd web && npm run lint && npm run format:check && npm run typecheck && npm test && npm run build`
- Standards: `node scripts/lint/repo-lint.mjs`
- Or use the `run-standards` skill.

## Meta-rules

- **Build/edit something → build/edit its skill.** Anytime you add or change a
  capability, create or update the matching `.claude/skills/<name>/SKILL.md` and
  refresh the skills `INDEX.md` (see the `update-a-skill` skill).
- **Every `.md` file stays under 150 lines.** Split long docs into linked files.
- Keep each `.claude/{rules,agents,skills,hooks}/INDEX.md` in sync with its dir.

## Standards (detailed rules)

@.claude/rules/rust.md
@.claude/rules/typescript.md
@.claude/rules/atomic-design.md
@.claude/rules/gdpr.md
@.claude/rules/testing.md
@.claude/rules/markdown.md
@.claude/rules/commits.md

## Discovery indexes

@.claude/rules/INDEX.md
@.claude/agents/INDEX.md
@.claude/skills/INDEX.md
@.claude/hooks/INDEX.md
