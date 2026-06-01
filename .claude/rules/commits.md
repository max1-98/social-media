# Commit & branch standards

## Conventional Commits

Format: `type(scope): summary`. Common types:

- `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `build`.
- Scope is the area, e.g. `feat(clubs):`, `chore(web):`, `ci(standards):`.
- Imperative, lower-case summary, no trailing period. Keep under ~72 chars.

## Branches

- Develop on the assigned feature branch; never push straight to the default
  branch. Push with `git push -u origin <branch>`.
- Open a PR only when explicitly asked.

## Before you commit

- Run the full local bar (see the `run-standards` skill): `cargo fmt --check`,
  `cargo clippy -- -D warnings`, `cargo test`; `npm run lint`, `format:check`,
  `typecheck`, `test`, `build`; `node scripts/lint/repo-lint.mjs`.
- Keep commits focused; one logical change per commit.
