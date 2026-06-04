# Phase 8 — Ranks, Tiers & Leaderboards (+ dual-ELO + integrity baseline)

Part of the [Gamification Roadmap](../ROADMAP.md). **The first shippable slice.**
Turn the existing μ/σ engine into a visible competitive ladder: a **number + tier
word** (e.g. `1,450 · Gold`), global/club/friends leaderboards, "find clubs at
your level", and a wrong-level join guard — with the **dual-ELO** split and a
dummy-proof integrity baseline so the ladder is trustworthy from day one.

See [data-model.md](data-model.md) for tables and [principles.md](principles.md)
for the ethics/opt-out rules.

## Dual-ELO + integrity baseline (do this first)

- [ ] Introduce a rating **scope** (`internal` vs `external`) on games; generalise
      the `sbmm` rating gate in `domain/games.rs:829` to key off scope +
      participant realness (no dummies, verified, distinct accounts).
- [ ] Flag dummy participants (`dummyuser_*` / `dummy_users`, `clubs.rs:1076`):
      they keep **internal** ELO + internal/club board positions, but any game with
      a dummy is **internal-scope** (never moves external ELO).
- [ ] Scope existing `(user, game_type)` ELO as **internal** (add `club_id`
      context) and add **external** ELO rows per `(user, game_type)`.
- [ ] σ-guard: cap how much a high-σ / very-new opponent can move external rating.

## Tiers (number + word — percentile-based, **locked**)

7 fixed tier words mapped by **percentile of external `conservative_rating`
(μ−3σ) within each `game_type`** — auto-calibrating, no hard-coded ELO constants.
Shown as `number · word` (e.g. `1,450 · Gold`). Internal/club boards reuse the
same words on the internal distribution.

| Tier | Bronze | Silver | Gold | Platinum | Diamond | Master | Elite |
|---|---|---|---|---|---|---|---|
| Percentile | 0–20 | 20–40 | 40–65 | 65–85 | 85–95 | 95–99 | 99+ |

- [ ] `tiers` table per `game_type` storing **percentile** band edges + order;
      seed the ladder above. Rating cutoffs materialized from the live
      distribution (lazy, cached in `leaderboard_snapshots`).
- [ ] Pure `tier_for(rating, cutoffs) -> Tier` in new `domain/ranks.rs` —
      **oracle-tested** on band boundaries (inclusive-low, exclusive-high).
- [ ] Optional sub-divisions (`Gold II`) later; percentile model supports it.

## Leaderboards

- [ ] `domain/leaderboards.rs`: global (per game_type/sport), per-club, friends.
- [ ] Indexed reads (`external_elo(game_type_id, conservative DESC)`, club variant);
      optional `leaderboard_snapshots` for lazy materialization.
- [ ] **Opt-out** + minor privacy: hide minors from public boards by default.
- [ ] Dummies/placeholders appear on **club/internal** boards but are **excluded
      from global/external** boards (no leaderboard positions outside a club).

## Find clubs at your level + join guard

- [ ] Extend club discovery (`GET /clubs/:sport`) to rank/filter by overlap of the
      user's external rating with each club's level band.
- [ ] `club_levels (club_id, game_type_id, min_rating, max_rating, guard_mode ∈
      open|warn|block)`; admin UI to set the band (default suggested from members).
- [ ] Enforce in `create_request` (`domain/clubs.rs:846`): block (403) /
      warn (allow + flag) / open; admins always override via the accept flow.

## Routes / API (typed JSON)

- [ ] `GET /api/ranks/:username` (number + tier per game_type, internal + external).
- [ ] `GET /api/leaderboards?scope=global|club|friends&game_type=…`.
- [ ] `GET /api/clubs/:sport?at_my_level=true`; guard response on join request.
- [ ] Register in `server/src/routes.rs`; stable error envelope.

## Frontend

- [ ] Atoms/molecules: `TierBadge` (number + word), `LeaderboardRow`, `RankChip`.
- [ ] Organism: `Leaderboard` (scope tabs); add rank to `ProfilePage` /
      `GameTypeElosPage`; club level-band editor + guard messaging on join.
- [ ] Types in `web/src/types/index.ts`; `ranks`/`leaderboards` API modules; tier
      colour tokens in `web/src/theme/theme.ts`. Vitest for each component.

## Tests

- [ ] Oracle: `tier_for` boundaries; ranked-scope gate (dummy → internal only;
      verified cross-club → external).
- [ ] Integration: leaderboard ordering + opt-out; guard block/warn/open + admin
      override; find-at-level returns level-matched clubs.

## Dependencies & DoD

- **Depends on:** nothing new (builds on existing engine). Enables P9.
- **DoD:** every player shows `number · tier` (internal + external); opt-out
  global/club/friends boards live; level-aware discovery + join guard working; a
  game with a dummy **cannot** move external ELO; `run-standards` green.
