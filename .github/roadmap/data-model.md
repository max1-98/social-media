# Gamification Data Model & GDPR Treatment

Part of the [Gamification Roadmap](../ROADMAP.md). New tables, the **dual-ELO**
scoping, and how each entity behaves on export/erasure. Migrations are numbered
from `0009_*`, **backfill-safe** (nullable/defaulted), and refresh `server/.sqlx`.
Existing schema lives in `server/migrations/0001_…0008_*`.

## Dual-ELO scoping (the spine)

Today `elo` is per `(user, game_type)` via `user_elos`, updated on SBMM games
(`domain/games.rs`). We split rating into **scopes**:

- **Internal** `(user, club, game_type)` — intra-club play; may include dummies;
  sandboxed. Re-scope existing `elo` per club, or add `club_id` to its context.
- **External** `(user, game_type)` — global; only inter-club competitive/league/
  fixture games with no dummies. The prestige ladder.
- **Club** — `club_elo (club_id, game_type_id, mu, sigma, games_played, ...)` for
  the fixture ladder; the aggregate-of-members view is computed on read.

A game/fixture carries a **scope** (`internal | external`) decided by context +
participant realness; the rating-update gate keys off it (generalises the current
`sbmm` gate at `games.rs:829`).

## New tables by phase

- **P8:** `tiers (game_type_id, name, order, min_rating, max_rating)`;
  `club_levels (club_id, game_type_id, min_rating, max_rating, guard_mode)`;
  external-ELO rows (+ scope discriminator); optional `leaderboard_snapshots`.
- **P9:** `club_fixtures (home_club_id, away_club_id, game_type_id, date, status)`;
  `fixture_games (fixture_id, game_id)`; `club_elo`; `result_confirmations
  (fixture_id, club_id, confirmed_by, status)`.
- **P10:** `integrity_flags (subject_user_id, kind, evidence_json, status,
  created_at)`; `match_signals (game_id, ip_hash, device_hash, ...)` (hashed).
- **P11:** `achievements (code, name, description, icon, category, criteria_json,
  xp_reward, repeatable, min_age_visibility)`; `user_achievements (user_id,
  achievement_id, progress, awarded_at)`; `user_progress (user_id, xp, level,
  updated_at)`.
- **P12:** `follows (follower_id, followee_id, created_at)`; `blocks (...)`.
- **P13:** `user_activity (user_id, last_active_on, current_streak, best_streak)`;
  `notifications (user_id, kind, payload_json, read_at, created_at)`;
  `notification_prefs (user_id, channel, enabled)`; `push_tokens (user_id,
  platform, token, created_at)`.
- **P14:** `event_rsvps (event_id, member_id, status)`; recurrence cols on
  `events`; `coach_profiles (user_id, bio, sports_json, ...)`.
- **P15:** `seasons (id, scope, game_type_id, starts_at, ends_at)`; `leagues
  (id, season_id, tier, name)`; `league_members (season_id, subject_id, division,
  points)`.
- **P16:** `challenges (id, scope, metric, target, starts_at, ends_at, reward)`;
  `challenge_progress (challenge_id, subject_id, value)`.
- **P18:** `subscriptions (user_id, provider, status, current_period_end)` on the
  reserved `users.tier`.

## Indexes (read paths)

- `external_elo (game_type_id, conservative_rating DESC)` — global boards.
- internal-ELO `(club_id, game_type_id, conservative_rating DESC)` — club boards.
- `club_elo (game_type_id, mu DESC)`; `league_members (season_id, division,
  points DESC)`; `notifications (user_id, read_at)`; `follows (followee_id)`.

## GDPR export & erasure treatment

`GET /account/export` includes **every** entity below. `DELETE /account` is
erasure-by-anonymization: keep **pseudonymous** rows so shared history /
leaderboards survive; hard-delete **purely personal** rows.

| Entity | In export | On erasure |
|---|---|---|
| internal/external/club ELO, standings | ✓ | **keep** (pseudonymous) |
| achievements, user_achievements, XP/level | ✓ | **keep** (pseudonymous) |
| tiers, club_levels (config) | ✓ (refs) | keep (not personal) |
| club_fixtures, result_confirmations | ✓ | keep; null actor PII |
| follows / blocks | ✓ | hard-delete rows where erased user is actor |
| notifications, push_tokens | ✓ | **hard-delete** (purely personal) |
| user_activity (streaks) | ✓ | keep counts; detach identity |
| coach_profiles, recap text | ✓ | **hard-delete** (free-text PII) |
| integrity_flags | ✓ (own) | keep flag; **purge raw IP/device evidence** |
| match_signals (ip/device hashes) | — (security) | **hard-delete** |
| subscriptions | ✓ | retain minimal billing record per tax law, null PII |

Dummies (`dummyuser_*`, `dummy_users`) are not data subjects. They **do** play
internal games and can hold **internal** ELO + appear on **club/internal**
leaderboards, but **never** hold external ELO or appear on **global/external**
leaderboards. They are cleaned up with their club (`clubs.rs:1006`).
