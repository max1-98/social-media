# Phase 13 — Streaks, Notifications & Activity Feed

Part of the [Gamification Roadmap](../ROADMAP.md). The daily engagement loop —
built **ethically**. Streaks via lazy expiry (no cron), batched notifications
(in-app + push), and a friends/club activity feed with kudos.

See [data-model.md](data-model.md) (P13 tables) and [principles.md](principles.md).

## Streaks (lazy, guilt-free)

- [ ] `user_activity (user_id, last_active_on, current_streak, best_streak)`.
- [ ] Compute streak **on read** from `last_active_on` (lazy expiry, no scheduler);
      tick on a `DayActive`/play event via the P11 engine.
- [ ] **Guilt-free pause** (freeze without loss); standard opt-out (adults on by
      default) / **minors off by default**; never weaponise ("about to break").

## Notifications (batched, capped)

- [ ] `notifications (user_id, kind, payload_json, read_at, created_at)`;
      `notification_prefs (user_id, channel, enabled)`; `push_tokens (...)`.
- [ ] In-app center + unread bell; mark-read; **batching + frequency caps**.
- [ ] Web Push now; design payloads/topics for native APNs/FCM (P18). Quiet hours;
      minors: streak/reminder push off by default.

## Activity feed + kudos

- [ ] Feed of followed players' / club activity (games, fixtures, achievements,
      level-ups) — chronological, **no infinite scroll** (paged), no autoplay.
- [ ] Lightweight `kudos` reaction (async social proof).

## Routes / API

- [ ] `GET /api/notifications`, `POST /api/notifications/read`,
      `PUT /api/notification-prefs`, `POST /api/push-tokens`;
      `GET /api/feed?cursor=…`; `POST /api/kudos/:activity`.

## Frontend

- [ ] `StreakWidget`, `NotificationBell` + center, `ActivityFeed` + `KudosButton`;
      notification settings page. Types + `notifications`/`feed` API modules; Vitest.

## Tests

- [ ] Integration: streak ticks + lazy expiry + pause; notification batching/caps;
      feed paging + kudos; minor defaults (push off). Erasure hard-deletes
      notifications + push tokens.

## Dependencies & DoD

- **Depends on:** P11 (engine/events), P12 (graph for feed/kudos).
- **DoD:** streaks compute lazily with guilt-free pause; notifications deliver
  in-app (+ web push) within caps; paged feed + kudos; safeguards enforced;
  `run-standards` green.
