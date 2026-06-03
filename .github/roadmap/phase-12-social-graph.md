# Phase 12 — Social Graph & Find Players

Part of the [Gamification Roadmap](../ROADMAP.md). Network effects: follow players,
find new players, and surface suggestions from the **existing** `played_with`
co-play graph. Addresses the deferred "find players" + "member search" items.

See [data-model.md](data-model.md) (P12 tables) and [principles.md](principles.md).

## Social graph

- [ ] `follows (follower_id, followee_id, created_at)` + `blocks (blocker_id,
      blocked_id)`; follow/unfollow/block; mutual = "friends".
- [ ] `domain/social.rs`: follow graph queries; respect blocks everywhere.
- [ ] Privacy: discovery opt-out; minors not surfaced in public discovery;
      blocked users hidden from each other.

## Find players & suggestions

- [ ] Player search (by username/name, sport, club, tier) — also satisfies the
      deferred "search bar on Members / Active Event" item.
- [ ] **Suggestions from `played_with`** (people you've played with most, and
      friends-of-co-players) + same-club + similar-tier nearby.
- [ ] "Players at your level" using external tier (ties into P8 find-at-level).

## Routes / API

- [ ] `POST /api/follow/:user`, `DELETE /api/follow/:user`, `POST /api/block/:user`;
      `GET /api/me/following`, `/followers`, `/suggestions`;
      `GET /api/players/search?q=…&sport=…&tier=…`.

## Frontend

- [ ] `FollowButton` atom, `PlayerCard` molecule, `PlayerSearch` +
      `SuggestionList` organisms; profile follow counts; search page.
- [ ] Types + `social` API module; Vitest for each.

## Tests

- [ ] Integration: follow/unfollow/block; blocked users excluded from search +
      suggestions; suggestions derive from `played_with`; minor privacy enforced.

## Dependencies & DoD

- **Depends on:** P8 (tiers for level-based suggestions). Feeds P13 feed/kudos.
- **DoD:** follow/find/search live; suggestions sourced from co-play; privacy +
  block + minor safeguards enforced; `run-standards` green.
