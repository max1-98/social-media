# Phase 14 — Club & Club-Night Management Tools (+ Coach)

Part of the [Gamification Roadmap](../ROADMAP.md). Make running a club and a club
night **effortless** — the organiser side of "Strava for clubs". Builds on the
existing events/matchmaking; adds recurrence, RSVP/attendance, on-the-night
rotation helpers, a club dashboard, and the deferred **Coach** role.

See [data-model.md](data-model.md) (P14 tables) and [principles.md](principles.md).

## Scheduling & attendance

- [ ] Recurring events (weekly club nights): recurrence cols on `events` + a
      lazy "next occurrence" generator (no scheduler).
- [ ] `event_rsvps (event_id, member_id, status ∈ going|maybe|out)`; RSVP UI +
      counts; reminders via P13 notifications (opt-in).
- [ ] Attendance check-in → feeds participation XP/streaks (P11/P13) and club
      "average attendance" (already surfaced on clubs).

## On-the-night tools

- [ ] Faster roster management: search/filter active members (deferred "member
      search"); quick add/remove; guests.
- [ ] Court/rotation helpers on top of existing SBMM/social matchmaking
      (`matchmaking.rs`): who's sitting out, next-up queue, fair rotation.
- [ ] One-tap score entry + result confirmation flow (mobile-friendly).

## Club dashboard & comms

- [ ] Club admin dashboard: attendance trends, internal leaderboard, top
      improvers, upcoming fixtures — all from existing stats (compute-on-read).
- [ ] Lightweight club announcements/posts (the dormant `posts` table) to members.

## Coach role

- [ ] `coach_profiles (user_id, bio, sports_json, ...)`; "Become a Coach"
      onboarding; discoverable in player/club search (P12).

## Routes / API

- [ ] `POST /api/event/:id/rsvp`, `GET /api/event/:id/rsvps`; recurrence on event
      create/edit; `GET /api/club/:pk/dashboard`; coach CRUD; club announcements.

## Frontend

- [ ] `RsvpControl`, `RotationBoard`, `ClubDashboard`, `CoachCard` /
      coach-onboarding; club announcements. Types + API modules; Vitest.

## Tests

- [ ] Integration: recurrence generates next night; RSVP counts; rotation fairness;
      dashboard aggregates; coach profile discoverable. Erasure hard-deletes coach
      bio (free-text PII).

## Dependencies & DoD

- **Depends on:** existing events/matchmaking; P13 (reminders), P12 (coach search).
- **DoD:** an organiser schedules a recurring night, collects RSVPs, runs fair
  rotations, enters results, and reads a club dashboard with less friction;
  `run-standards` green.
