# Rules Index

Lightweight engineering standards. Each file stays under 150 lines and is loaded
into context via `@`-imports in the root `CLAUDE.md`.

- @.claude/rules/rust.md — Rust + Axum + sqlx conventions, error handling, lean deps.
- @.claude/rules/typescript.md — full typing (no `any`), strict TS, imports, barrels.
- @.claude/rules/atomic-design.md — layer import direction + barrel-export rules.
- @.claude/rules/gdpr.md — consent gating, anonymized deletion, age gate, residency.
- @.claude/rules/testing.md — cargo oracle tests, Vitest + React Testing Library.
- @.claude/rules/markdown.md — 150-line rule, splitting, index-sync, frontmatter.
- @.claude/rules/commits.md — Conventional Commits and branch flow.
