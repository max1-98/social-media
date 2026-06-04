# Phase 15 — Leagues, Seasons & Divisions

Part of the [Gamification Roadmap](../ROADMAP.md). Structured, recurring
competition (Duolingo/Strava-style): seasonal leagues with promotion/relegation
for **both** individuals and clubs, where **league games count as external ELO**.
Season rollover is **lazy** (compute-on-read), no scheduler.

See [data-model.md](data-model.md) (P15 tables) and [principles.md](principles.md).

## Seasons & divisions

- [ ] `seasons (id, scope, game_type_id, starts_at, ends_at)`; `leagues
      (id, season_id, tier, name)`; `league_members (season_id, subject_id,
      division, points)` (subject = user or club).
- [ ] **Lazy rollover**: on first read after `ends_at`, finalise standings, apply
      promotion/relegation, seed the next season — idempotently, no cron.
- [ ] Division placement from external tier (P8); fresh standings each season.

## League play & scoring

- [ ] League fixtures (clubs) reuse P9; individual league games reuse external
      scope (P8). Points for results within the season window.
- [ ] Promotion/relegation rules (top/bottom N per division), ethical framing
      (spotlight without shame; no countdown urgency); minors limited.

## Routes / API

- [ ] `GET /api/seasons/current`, `GET /api/leagues/:id/standings`,
      `GET /api/me/league` (my division + position + promo/releg line).

## Frontend

- [ ] `DivisionBadge`, `LeagueTable` organism, my-league widget, season banner +
      end-of-season summary. Types + `leagues` API module; Vitest.

## Tests

- [ ] Oracle/integration: lazy rollover is idempotent + correct; promotion/
      relegation math; league points only from in-window external games; minor
      visibility rules.

## Dependencies & DoD

- **Depends on:** P8 (tiers/external), P9 (club fixtures), P10 (integrity).
- **DoD:** individuals + clubs sit in divisions; seasons roll over lazily with
  correct promotion/relegation; standings reflect external results only;
  `run-standards` green.
