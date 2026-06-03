# Gamification Roadmap — "Strava for all sports"

Long-term plan to gamify the app on top of the live Phase-7 rebuild: visible
ranks, leaderboards, achievements, clubs that face each other, find-players, and
"find clubs at your level" — engaging but **ethical** (handles minors' data;
GDPR/EU-DSA bound) and **cheap** (single binary, no schedulers).

This folder is the executable backlog. Each phase file is a **todo checklist +
definition of done**. Every `.md` here stays **under 150 lines** (repo rule).

## Read first

- [principles.md](roadmap/principles.md) — engagement frameworks, ethical
  guardrails, success metrics, research references.
- [data-model.md](roadmap/data-model.md) — new tables, the **dual-ELO** scoping,
  indexes, and the GDPR export/erasure treatment per entity.

## Core idea: dual ELO (anti-cheat by design)

- **Internal ELO** `(user, club, game_type)` — intra-club club-night games; may
  include `dummy_users`; **sandboxed**, never affects global rank.
- **External ELO** `(user, game_type)`, global — moves **only** from inter-club
  competitions / leagues / club-vs-club fixtures with **real, verified, distinct
  accounts (no dummies)**. Powers tiers, leaderboards, find-at-level, join guard.
- **Club ELO** — a club-vs-club **fixture ladder** plus an **aggregate-of-members**
  view.

Ranks display a **number + tier word** (e.g. `1,450 · Gold`) from external ELO.

## Phases

| Ph | File | Theme |
|----|------|-------|
| 8  | [phase-08-ranks-tiers-leaderboards.md](roadmap/phase-08-ranks-tiers-leaderboards.md) | Ranks, Tiers & Leaderboards + dual-ELO + integrity baseline |
| 9  | [phase-09-club-vs-club.md](roadmap/phase-09-club-vs-club.md) | Club-vs-Club Fixtures & Club ELO |
| 10 | [phase-10-integrity-anti-cheat.md](roadmap/phase-10-integrity-anti-cheat.md) | Integrity & Anti-Cheat (deep) |
| 11 | [phase-11-achievements-xp.md](roadmap/phase-11-achievements-xp.md) | Achievements & XP/Levels (+ engine) |
| 12 | [phase-12-social-graph.md](roadmap/phase-12-social-graph.md) | Social Graph & Find Players |
| 13 | [phase-13-streaks-notifications-feed.md](roadmap/phase-13-streaks-notifications-feed.md) | Streaks, Notifications & Activity Feed |
| 14 | [phase-14-club-night-tools.md](roadmap/phase-14-club-night-tools.md) | Club & Club-Night Tools (+ Coach) |
| 15 | [phase-15-leagues-seasons.md](roadmap/phase-15-leagues-seasons.md) | Leagues, Seasons & Divisions |
| 16 | [phase-16-challenges-quests.md](roadmap/phase-16-challenges-quests.md) | Challenges & Quests |
| 17 | [phase-17-recaps-shareables.md](roadmap/phase-17-recaps-shareables.md) | Recaps & Shareable Cards |
| 18 | [phase-18-native-premium.md](roadmap/phase-18-native-premium.md) | Native Mobile & Club+ Premium |

## How to execute a phase

1. Read the phase file + `data-model.md`; confirm thresholds/curves to seed.
2. Backend first (migrations → domain → routes → tests), then frontend
   (types → api → atoms→pages → tests). Use the project skills: `new-migration`,
   `new-endpoint`, `new-atom`, `port-django-logic`, `run-standards`.
3. Keep `server`/`web`/`standards` CI green; add the matching skill per the
   "build something → build its skill" meta-rule.
4. Tick the checklist; update this index if a phase splits.

## Guardrails (every phase)

Ethical engagement (no dark patterns; minor safeguards), GDPR (export + erasure
for every new entity), single-binary/no-scheduler (lazy expiry, compute-on-read),
full typing + tests. Details in [principles.md](roadmap/principles.md).
