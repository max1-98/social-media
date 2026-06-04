# Phase 17 — Recaps & Shareable Cards ("Year in Sport")

Part of the [Gamification Roadmap](../ROADMAP.md). Turn a player's data into a
narrative they want to share — monthly/seasonal/annual recaps and clean shareable
cards (Strava "Year in Sport" / Spotify Wrapped energy). Computed **on read**;
privacy-safe by default.

See [data-model.md](data-model.md) and [principles.md](principles.md).

## Recap generation

- [ ] Compute-on-read recap from existing data: games/wins, attendance, best
      streak, rating/tier growth, top partners (`played_with`), achievements,
      league finish. Periods: month / season / year.
- [ ] Optional `recap_snapshots` cache (lazy); no scheduler.
- [ ] Narrative copy (templated) + a few highlight stats; tasteful, honest.

## Shareable cards

- [ ] Render a card image (server-side or canvas) per recap highlight; export via
      the native share sheet (P18) or download.
- [ ] **Privacy:** opt-in for public sharing; **minors → private only**, no
      identity exposed; no third-party share trackers without consent.

## Routes / API

- [ ] `GET /api/me/recap?period=month|season|year`;
      `GET /api/me/recap/card/:highlight` (image).

## Frontend

- [ ] `RecapCard` / `RecapStory` organism, recap page, share/download controls,
      year-end banner entry point. Types + `recap` API module; Vitest.

## Tests

- [ ] Integration: recap aggregates correct numbers on a seeded history; card
      renders; minor recaps are private; export includes recap data; erasure
      hard-deletes any stored recap text.

## Dependencies & DoD

- **Depends on:** accumulated data from P8/P11/P15; share sheet from P18 (web
  download interim).
- **DoD:** a player gets an accurate, shareable recap; privacy + minor rules
  enforced; `run-standards` green.
