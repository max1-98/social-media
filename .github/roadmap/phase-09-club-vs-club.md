# Phase 9 — Club-vs-Club Fixtures & Club ELO

Part of the [Gamification Roadmap](../ROADMAP.md). Let clubs **face each other**.
Inter-club fixtures/competitions are the trusted source of **external** ELO (real,
verified, non-dummy players on both sides) and produce a **club ELO** ladder plus
an aggregate-of-members view. This is what makes the Phase-8 external ladder fill
with meaningful results.

See [data-model.md](data-model.md) (P9 tables) and
[principles.md](principles.md).

## Fixtures & competitions

- [ ] `club_fixtures (home_club_id, away_club_id, game_type_id, date, status)` +
      `fixture_games (fixture_id, game_id)`; statuses: proposed → accepted →
      played → confirmed.
- [ ] `domain/fixtures.rs`: propose / accept / decline a fixture between two clubs
      (admins of each club); schedule date + game_type.
- [ ] Record fixture results by reusing the existing event/game scoring flow, but
      tagged **external scope** (no dummies allowed; reject if any participant is a
      `dummyuser_*` or unverified).
- [ ] `result_confirmations (fixture_id, club_id, confirmed_by, status)` — both
      clubs confirm the result before external ELO moves (two-sided trust).

## Club ELO (both ladder + aggregate)

- [ ] `club_elo (club_id, game_type_id, mu, sigma, games_played, ...)`; update via
      a club-level `RatingModel` when a fixture is confirmed.
- [ ] Aggregate-of-members view computed on read (e.g. average/top-N external
      conservative rating) — a "club strength" indicator alongside club ELO.
- [ ] Feed both into the Phase-8 club leaderboards + club profile.

## Player external ELO from fixtures

- [ ] On confirmed fixture games, update each **real** player's external ELO
      (Phase-8 scope gate); never touch internal ELO from fixtures.
- [ ] Award participation XP / achievements via the Phase-11 engine (once built).

## Routes / API

- [ ] `POST /api/club/:pk/fixtures` (propose), `POST /api/fixture/:id/accept`,
      `/decline`, `/confirm`; `GET /api/club/:pk/fixtures`; `GET /api/fixture/:id`.
- [ ] `GET /api/leaderboards/clubs?game_type=…` (club ELO + aggregate).

## Frontend

- [ ] `FixtureCard` molecule, `FixturePanel`/`FixtureList` organism, club-vs-club
      schedule + result-confirmation UI; club ELO + strength on club profile.
- [ ] Types + `fixtures` API module; Vitest for components.

## Tests

- [ ] Integration: propose→accept→play→**both confirm**→external ELO + club ELO
      move; a fixture containing a dummy/unverified player is rejected from
      external scope; one-sided confirmation does **not** move ratings.
- [ ] Oracle/reference: club-level rating update is deterministic.

## Dependencies & DoD

- **Depends on:** P8 (external scope + club leaderboards). Enables P15 leagues.
- **DoD:** two clubs can schedule, play, and both-confirm a fixture; external
  player ELO + club ELO update only then; dummies/unverified are excluded;
  `run-standards` green.
