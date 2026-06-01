# Rebuild Plan & Requirements: Lightweight, Ad-Funded, GDPR-Compliant Sports Social Network

## Session goal

Produce an agreed **plan + requirements** that can be executed across multiple
future sessions to **rebuild the current app from scratch** as a *lightweight,
predictably near-zero-cost, ad-funded, GDPR-compliant* sports social network at
**full feature parity**. Execution is deliberately sequenced:

> **Plan → scaffold the rebuild in this repo (on the `rebuild` branch) → set up
> standards (`.claude/` config + linters/formatters/CI) → only then implement
> features.**

Standards come first so every line of feature code is written to a fixed bar.

> **Repo decision (updated):** keep the existing repo rather than create a new
> one. The rebuild is a parity port, so the old code (`backend/`, `frontend/`) is
> a constant reference and is most useful living alongside the new code
> (`server/`, `web/`). One set of CI secrets, branch protection, MCP scope, and
> deploy wiring. Old code is removed at cutover (Phase 7), which also clears the
> inherited Dependabot alerts from the default branch.

## Document map

This plan is split so each file stays scannable (and under the 150-line rule):

- **[Context & Target Architecture](rebuild/01-context-architecture.md)** — why
  we're rebuilding and the cheap, predictable Rust/Axum + SQLite stack.
- **[GDPR & Data Protection](rebuild/02-gdpr.md)** — consent, data-subject
  rights, minors, security, and processor paperwork (designed in, ~$0).
- **[Execution Phases](rebuild/03-phases.md)** — Phases 1–7 with the
  definition of done for each.
- **[Verification, Open Items & Deferred](rebuild/04-verification-deferred.md)** —
  cross-phase verification, decisions to confirm, and post-parity roadmap.
