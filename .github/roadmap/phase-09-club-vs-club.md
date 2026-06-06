# Phase 9 — Club-vs-Club Fixtures & Club ELO

Part of the [Gamification Roadmap](../ROADMAP.md). Let clubs **face each other**.
Inter-club fixtures/competitions are the trusted source of **external** ELO (real,
verified, non-dummy players on both sides) and produce a **club ELO** ladder plus
an aggregate-of-members view. This is what makes the Phase-8 external ladder fill
with meaningful results.

See [data-model.md](data-model.md) (P9 tables) and
[principles.md](principles.md).

> **Status:** implemented. This phase bundled the **minimal Phase 8 foundation**
> it needed — a rating **scope** (`internal`/`external`) on `games` + `elo`
> (migration `0010`) and the no-dummies external gate. The rest of Phase 8
> (tiers, leaderboard UI, find-at-level, join guard) is still **deferred**. See
> the `club-fixtures` skill.

## Fixtures & competitions

- [x] `club_fixtures (home_club_id, away_club_id, game_type_id, date, status)` +
      `fixture_games (fixture_id, game_id)`; statuses: proposed → accepted →
      played → confirmed (+ declined, cancelled). Migration `0011`.
- [x] `domain/fixtures.rs`: propose / accept / decline / cancel a fixture between
      two clubs (admins of each club); schedule date + game_type.
- [x] Record fixture results tagged **external scope** (no dummies allowed; reject
      if any participant is a `dummyuser_*` or unverified) via `external_eligible`.
- [x] `result_confirmations (fixture_id, club_id, confirmed_by, status)` — both
      clubs confirm the result before external ELO moves (two-sided trust).

## Club ELO (both ladder + aggregate)

- [x] `club_elo (club_id, game_type_id, mu, sigma, games_played, ...)`; update via
      a club-level `RatingModel` (`domain/club_elo.rs`) when a fixture is confirmed.
- [x] Aggregate-of-members view computed on read (mean external conservative
      rating) — a "club strength" indicator alongside club ELO.
- [x] Feed both into the club leaderboard endpoint + club profile.

## Player external ELO from fixtures

- [x] On confirmed fixture games, update each **real** player's external ELO
      (scope gate); never touch internal ELO from fixtures.
- [ ] Award participation XP / achievements via the Phase-11 engine (once built).

## Routes / API

- [x] `POST /api/club/:pk/fixtures` (propose), `POST /api/fixture/:id/accept`,
      `/decline`, `/cancel`, `/games` (record), `/confirm`;
      `GET /api/club/:pk/fixtures`; `GET /api/fixture/:id`.
- [x] `GET /api/leaderboards/clubs?game_type=…` (club ELO + aggregate strength).

## Frontend

- [x] `FixtureCard` molecule, `FixturePanel`/`FixtureList` organism, club-vs-club
      schedule + result-confirmation UI; club ELO + strength on club profile.
- [x] Types + `fixtures` API module; Vitest for components.

## Tests

- [x] Integration: propose→accept→play→**both confirm**→external ELO + club ELO
      move; a fixture containing a dummy/unverified player is rejected from
      external scope; one-sided confirmation does **not** move ratings.
- [x] Oracle/reference: club-level rating update is deterministic.

## Dependencies & DoD

- **Depends on:** P8 (bundled the minimal scope foundation here). Enables P15.
- **DoD:** ✅ two clubs can schedule, play, and both-confirm a fixture; external
  player ELO + club ELO update only then; dummies/unverified are excluded;
  `run-standards` green.
