# Phase 11 — Achievements & XP/Levels (+ the event-driven engine)

Part of the [Gamification Roadmap](../ROADMAP.md). The accomplishment layer — and
the **reusable engine** that powers achievements, XP, streaks, and challenges
**without a scheduler**: one inline domain-event emission point evaluated at
completion handlers.

See [data-model.md](data-model.md) (P11 tables) and [principles.md](principles.md).

## Event-driven engine (no cron)

- [ ] Define a `DomainEvent` enum (GameCompleted, EventCompleted, FixtureConfirmed,
      ClubJoined, DayActive, TierChanged, …) emitted at one place per action.
- [ ] Add an emission point in the games/events/fixtures completion flow
      (`domain/games.rs` already updates ratings + stats — extend it).
- [ ] An `engine` that, given an event, **evaluates** achievement criteria, XP
      awards, streak ticks, and challenge progress inline (transactional).
- [ ] Pure, table-driven criteria (data, not code) so new achievements need no
      redeploy where possible.

## Achievements

- [ ] `achievements` catalog (code, name, description, icon, category,
      `criteria_json`, `xp_reward`, repeatable, `min_age_visibility`).
- [ ] `user_achievements (user_id, achievement_id, progress, awarded_at)`.
- [ ] Seed a starter set: first game, 10/50/100 games, win streak N, reach a tier,
      first fixture, join/found a club, attend N club nights, comeback win, etc.
- [ ] Award idempotently on the matching domain event; progress for multi-step ones.

## XP & levels

- [ ] `user_progress (user_id, xp, level, updated_at)`. XP = **participation/
      loyalty** (games, attendance, milestones), distinct from skill rating.
- [ ] Seeded **level curve** (easy early, steeper later) — pure, **oracle-tested**.
- [ ] Anti-farm: XP from external/confirmed play weighted higher; dummy games give
      no XP to real users.

## Routes / API

- [ ] `GET /api/achievements` (catalog + my progress); `GET /api/profile/:username/
      achievements`; `GET /api/me/progress` (xp, level, next-level gap).

## Frontend

- [ ] `AchievementBadge` atom, `ProgressBar`/`LevelChip`, `AchievementShowcase`
      organism on profile; tasteful award toast (≤1s, no dark pattern).
- [ ] Types + `achievements` API module; Vitest for each.

## Tests

- [ ] Oracle: level curve (xp→level) + a few achievement criteria evaluators.
- [ ] Integration: completing a real game awards the right badge/XP exactly once;
      dummy game awards nothing; export/erasure include achievements + XP.

## Dependencies & DoD

- **Depends on:** P8 (tiers, for tier achievements). Engine reused by P13/P16.
- **DoD:** badges + XP/level award on real actions via the engine; visible on
  profile; GDPR export/erasure handle them; `run-standards` green.
