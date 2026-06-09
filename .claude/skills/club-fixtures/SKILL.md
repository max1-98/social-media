---
name: club-fixtures
description: Use to add or extend club-vs-club fixtures, the external rating scope, and club ELO — the Phase 9 flow where two clubs propose, accept, play, and both-confirm a fixture before external player ELO and club ELO move.
---

# club-fixtures

Phase 9: clubs face each other. Inter-club fixtures are the **only** source of
**external** ELO (real, verified, non-dummy players) and feed the **club ELO**
ladder. See `.github/roadmap/phase-09-club-vs-club.md` and `.claude/rules/gdpr.md`.

## The rating scope (do not break this)

- Every `games` row and every `elo` row carries a `scope` (`internal` |
  `external`), default `internal` (migration `0010_rating_scope.sql`).
- `domain::games::update_elo` takes a `scope` param; `elo_row_for_member` filters
  + stamps it. A `(user, game_type)` can hold one internal **and** one external
  row via `user_elos`.
- **Display + matchmaking read `internal` only.** Any new `elo` SELECT for a
  rating/leaderboard/matchmaking read must add `AND e.scope = 'internal'` (or
  `'external'` for prestige boards) — never read both unscoped. Audited reads
  live in `games.rs`, `elo.rs`, `events.rs`, `clubs.rs`.
- Internal ELO is **never** moved by a fixture.

## The fixture lifecycle (`domain/fixtures.rs`)

`proposed → accepted → played → confirmed` (+ `declined`, `cancelled`).

1. `propose_fixture` — home-club admin; `accept`/`decline` — away-club admin;
   `cancel` — admin of either club, pre-confirm. Gate with the local
   `require_club_admin` (each domain module has its own; mirror `games.rs:120`).
2. `record_fixture_game` — admin of either club. **No-dummies gate first**
   (`external_eligible`: every member is `users.is_active = 1`, verified, and not
   `dummyuser_*`). Persist a `scope = 'external'` `games` row, link via
   `fixture_games`, score it, mark `played`. Reject (400) on any dummy/unverified.
3. `confirm_fixture` — upserts `result_confirmations`. **Only when BOTH clubs have
   confirmed** does settlement run: external player ELO via
   `update_elo(scope = "external")`, and club ELO for both clubs. One-sided
   confirmation moves nothing.

## Club ELO (`domain/club_elo.rs`)

- Pure, oracle-tested club-vs-club update: each club is a one-player `TeamSkills`;
  reuse `crate::skill::RatingModel` (Weng-Lin). `update_clubs` / `outcome` /
  `FixtureOutcome` / `ClubRating`. Persist to `club_elo` (UNIQUE `club_id,
  game_type_id`), `elo` = `conservative_rating` rounded.
- **Aggregate-of-members "strength"** is computed **on read** (mean external
  conservative rating of real members) — no stored column, no scheduler.

## Routes (merged under `/api`, flat like clubs)

`POST/GET /club/:pk/fixtures`; `GET /fixture/:id`; `POST /fixture/:id/{accept,
decline,cancel,games,confirm}`; `GET /leaderboards/clubs?game_type=<name>`.
`game_type` is an optional **name** on input, resolved to `game_types.id`; ids on
the wire are sqids newtypes (`FixtureId = 9` in `id.rs`). Reference ids
(`game_type`) stay numeric.

## GDPR (`domain/auth.rs`)

Export adds `fixtures_created`, `fixture_confirmations`, `external_elo`. Erasure
**keeps** the shared fixture/confirmation rows and external ELO (pseudonymous) but
**nulls** `created_by` / `confirmed_by`. Per `.github/roadmap/data-model.md`.

## Frontend (`web/`)

- Types: `Fixture`, `FixtureStatus`, `FixtureGame`, `FixtureConfirmation`,
  `FixtureDetail`, `ClubLadderEntry` in `src/types`. `game_type` is numeric on
  the wire; all other ids are opaque strings — never unpack one.
- API namespace `fixturesApi` (`src/api/fixtures.ts`): `proposeFixture`,
  `listClubFixtures`, `fixtureDetail`, `accept/decline/cancelFixture`,
  `recordFixtureGame`, `confirmFixture`, `clubLeaderboard(gameType?)`.
- Components: `FixtureCard` (molecule), `FixturePanel` + `ClubLeaderboard`
  (organisms; the ladder reuses the `DataGrid`). Pages own all `api` calls and
  pass callbacks; `FixturesPage` (route `/club/:clubId/fixtures`) wires the
  propose form, the record-result modal, confirm, and the ladder.
- Global ladder: `ClubRankingsPage` (route `/club-rankings`, navbar item) scopes
  the ladder by game type. The ladder is **per game type**, so the unscoped
  endpoint is empty — the page requires a selection from `gamesApi.gameTypes`
  (`GET /api/game-types`).

## Done when

Two clubs can propose → accept → play → both-confirm; external player ELO + club
ELO move **only** then; dummies/unverified are rejected; one-sided confirm is a
no-op; `cargo sqlx prepare -- --all-targets` refreshed; `run-standards` green.
