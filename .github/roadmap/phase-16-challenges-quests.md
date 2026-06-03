# Phase 16 — Challenges & Quests

Part of the [Gamification Roadmap](../ROADMAP.md). Time-bound, opt-in goals for
individuals and clubs ("play 10 games this month", "win vs a higher tier", "club
logs 50 games together"), evaluated by the **Phase-11 engine**. Async, no
countdown-urgency, rewarded with XP/badges.

See [data-model.md](data-model.md) (P16 tables) and [principles.md](principles.md).

## Challenge definitions & progress

- [ ] `challenges (id, scope ∈ personal|club|global, metric, target, starts_at,
      ends_at, reward_json)`; `challenge_progress (challenge_id, subject_id, value)`.
- [ ] Metrics reuse existing/engine signals (games played, wins, attendance,
      tier-ups, fixtures) — no new tracking where avoidable.
- [ ] Progress updated **inline** on domain events (P11); award reward on completion.
- [ ] Opt-in join; clear end date but **no artificial countdown pressure**; minors
      see age-appropriate challenges only.

## Club challenges

- [ ] Club-wide goals (sum of members' contributions) → shared progress bar; ties
      into club dashboard (P14) and feed (P13).

## Routes / API

- [ ] `GET /api/challenges` (available + joined + progress),
      `POST /api/challenges/:id/join`, `GET /api/club/:pk/challenges`.

## Frontend

- [ ] `ChallengeCard` + `ChallengeProgress` molecules, `ChallengeBoard` organism,
      club challenge widget. Types + `challenges` API module; Vitest.

## Tests

- [ ] Integration: join → progress accrues from real events → reward granted once;
      expired challenges stop accruing; club aggregate sums members; minor filter.

## Dependencies & DoD

- **Depends on:** P11 (engine), P14 (club dashboard), P13 (feed/notify).
- **DoD:** personal + club challenges definable, progress tracked event-driven,
  rewards granted idempotently, ethical framing; `run-standards` green.
