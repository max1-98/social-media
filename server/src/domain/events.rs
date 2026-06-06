//! Events: club events, member activation, lifecycle (start/complete),
//! per-event statistics, and lazy auto-management (activate/complete/delete).
//!
//! Ports: `backend/events/` (models, services, serializers, views, fetch_events).
//! JSON shapes mirror the Django serializers exactly. The per-event stat maps
//! Django stored as JSONField (keyed by member id as string) are kept as JSON
//! TEXT columns; the pure transform helpers below operate on the parsed maps so
//! `domain::games` can reuse them on game completion.

use std::collections::BTreeMap;

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use time::format_description::well_known::Rfc3339;
use time::macros::format_description;
use time::{Date, Duration, OffsetDateTime};

use crate::domain::auth::AuthUser;
use crate::error::AppError;
use crate::id::{ApiPath, ClubId, EventId, MemberId, SeriesId, UserId};
use crate::state::AppState;

// ===========================================================================
// Pure stat helpers (ported from events/models.py; unit-tested below).
//
// All maps are keyed by member id rendered as a string, mirroring Django's
// JSONField keys. Exposed `pub` so `domain::games` can call them on game
// completion and persist the results.
// ===========================================================================

// These pure stat transforms are the parity-ported `Event` stat methods,
// consumed by `domain::games` on game completion.

/// A single game's teams, used by the stat transforms. `team1`/`team2` are the
/// member ids on each side; `team1_won` mirrors `elo.services.team1Win`.
#[derive(Debug, Clone)]
pub struct GameResult {
    pub team1: Vec<i64>,
    pub team2: Vec<i64>,
    pub team1_won: bool,
}

impl GameResult {
    /// All members across both teams (mirrors `game.all_users`).
    fn all_members(&self) -> Vec<i64> {
        let mut all = self.team1.clone();
        all.extend(self.team2.iter().copied());
        all
    }
}

/// Mirror of `elo.services.team1Win`: parse a `"t1,t2"` score; team 1 wins when
/// its score is strictly greater. Returns `None` on a malformed score.
///
/// `domain::games` determines winners via `crate::rating::team1_win`; this
/// variant remains as the unit-tested parity reference for the stat path.
#[allow(dead_code)]
pub fn team1_win(score: &str) -> Option<bool> {
    let (a, b) = score.split_once(',')?;
    let t1: i64 = a.trim().parse().ok()?;
    let t2: i64 = b.trim().parse().ok()?;
    Some(t1 > t2)
}

/// Port of `Event.update_player_match_counts`: +1 for every member who played.
pub fn update_player_match_counts(counts: &mut BTreeMap<String, i64>, game: &GameResult) {
    for member in game.all_members() {
        let key = member.to_string();
        *counts.entry(key).or_insert(0) += 1;
    }
}

/// Port of `Event.update_player_win_counts`. Increments wins + winstreaks for the
/// winning team, resets the losing team's winstreak, and tracks `best_winstreak`.
///
/// Replicates the legacy quirk in the team-2-wins branch: the winstreak is set
/// from `wins` (not the prior winstreak), and the `best_winstreak` update only
/// triggers when `best_winstreak` is already non-empty (a first-ever team-2 win
/// leaves `best_winstreak` untouched) — see `events/models.py`.
pub fn update_player_win_counts(
    wins: &mut BTreeMap<String, i64>,
    winstreaks: &mut BTreeMap<String, i64>,
    best_winstreak: &mut BTreeMap<String, i64>,
    game: &GameResult,
) {
    if game.team1_won {
        for player in &game.team1 {
            let key = player.to_string();
            *wins.entry(key.clone()).or_insert(0) += 1;
            let streak = winstreak_increment(winstreaks, &key);
            update_best_winstreak(best_winstreak, &key, streak, true);
        }
        for player in &game.team2 {
            winstreaks.insert(player.to_string(), 0);
        }
    } else {
        for player in &game.team2 {
            let key = player.to_string();
            *wins.entry(key.clone()).or_insert(0) += 1;
            // Legacy quirk: winstreak is taken from `wins`, not the prior streak.
            let streak = *wins.get(&key).unwrap_or(&0);
            winstreaks.insert(key.clone(), streak);
            update_best_winstreak(best_winstreak, &key, streak, false);
        }
        for player in &game.team1 {
            winstreaks.insert(player.to_string(), 0);
        }
    }
}

/// Increment and return a player's winstreak (team-1 path).
fn winstreak_increment(winstreaks: &mut BTreeMap<String, i64>, key: &str) -> i64 {
    let streak = winstreaks.get(key).copied().unwrap_or(0) + 1;
    winstreaks.insert(key.to_string(), streak);
    streak
}

/// Best-winstreak update. `seed_when_empty` matches the legacy asymmetry: the
/// team-1 branch seeds `best_winstreak` when empty, the team-2 branch does not.
fn update_best_winstreak(
    best: &mut BTreeMap<String, i64>,
    key: &str,
    streak: i64,
    seed_when_empty: bool,
) {
    if best.is_empty() {
        if seed_when_empty {
            best.insert(key.to_string(), streak);
        }
        return;
    }
    let current_max = best.values().copied().max().unwrap_or(0);
    if streak > current_max {
        best.clear();
        best.insert(key.to_string(), streak);
    } else if streak == current_max {
        best.insert(key.to_string(), streak);
    }
}

/// Port of `Event.update_player_social_counts`: accumulate co-play counts. For
/// each player, every other player in the game gets +1 in that player's map.
pub fn update_player_social_counts(
    played_with: &mut BTreeMap<String, BTreeMap<String, i64>>,
    game: &GameResult,
) {
    let all = game.all_members();
    for player in &all {
        let entry = played_with.entry(player.to_string()).or_default();
        for other in &all {
            if other != player {
                *entry.entry(other.to_string()).or_insert(0) += 1;
            }
        }
    }
}

/// Port of `serializers.get_min_matches`: the minimum match count, or 0 if empty.
fn min_matches(counts: &BTreeMap<String, i64>) -> i64 {
    counts.values().copied().min().unwrap_or(0)
}

// ===========================================================================
// Lazy auto-management (port of services.auto_manage_events).
//
// Per `.claude/rules/rust.md` we prefer lazy expiry over a scheduler: the event
// list endpoint runs this before serializing. Each predicate is pure so the IO
// (load/save/delete) stays in the handler.
// ===========================================================================

/// Should a not-yet-active event auto-activate? (date in the past + start passed)
fn should_activate(event_active: bool, date: Date, today: Date, start_time_passed: bool) -> bool {
    !event_active && date < today && start_time_passed
}

/// Should a not-yet-complete event auto-complete? (2+ days past its date)
fn should_complete(event_complete: bool, date: Date, today: Date) -> bool {
    !event_complete && date + Duration::days(2) < today
}

// ===========================================================================
// Recurrence (event series). Pure date math, unit-tested below; the IO that
// materializes concrete events lives in `materialize_series`.
// ===========================================================================

/// How far ahead `materialize_series` generates instances (~8 weeks). Keeping a
/// rolling horizon (rather than the full series at once) bounds the row count
/// and lets lazy generation top up as listings happen.
const MATERIALIZE_HORIZON_DAYS: i64 = 56;

/// Add `months` calendar months to `date`, clamping the day to the target
/// month's length (e.g. Jan 31 + 1 month -> Feb 28/29). Pure.
fn add_months(date: Date, months: i64) -> Option<Date> {
    let total = i64::from(date.year()) * 12 + (i64::from(u8::from(date.month())) - 1) + months;
    let year = i32::try_from(total.div_euclid(12)).ok()?;
    let month = time::Month::try_from(u8::try_from(total.rem_euclid(12)).ok()? + 1).ok()?;
    let day = date.day().min(month.length(year));
    Date::from_calendar_date(year, month, day).ok()
}

/// The next occurrence after `date` for a `frequency`/`interval` rule. Pure.
fn next_occurrence(date: Date, frequency: &str, interval: i64) -> Option<Date> {
    let n = interval.max(1);
    match frequency {
        "daily" => date.checked_add(Duration::days(n)),
        "weekly" => date.checked_add(Duration::days(7 * n)),
        "monthly" => add_months(date, n),
        _ => None,
    }
}

// ===========================================================================
// Time + JSON helpers
// ===========================================================================

fn now() -> OffsetDateTime {
    OffsetDateTime::now_utc()
}

fn fmt_ts(t: OffsetDateTime) -> Result<String, AppError> {
    t.format(&Rfc3339)
        .map_err(|e| AppError::Internal(format!("time format: {e}")))
}

/// Parse a stored `date` column (`YYYY-MM-DD`) to a `Date`.
fn parse_date(s: &str) -> Option<Date> {
    let fmt = format_description!("[year]-[month]-[day]");
    Date::parse(s, &fmt).ok()
}

/// Parse a stored JSON object of `id -> int` into a `BTreeMap`.
fn parse_int_map(raw: &str) -> BTreeMap<String, i64> {
    serde_json::from_str(raw).unwrap_or_default()
}

/// Mirror of `games.views.number_in_team`: 1 for "...singles", 2 for "...doubles",
/// else null (the legacy returns `None`).
fn number_in_team(game_type_name: Option<&str>) -> Option<i64> {
    let name = game_type_name?;
    if name.ends_with("singles") {
        Some(1)
    } else if name.ends_with("doubles") {
        Some(2)
    } else {
        None
    }
}

// ===========================================================================
// Permission helpers (shared semantics with clubs.rs).
// ===========================================================================

async fn club_exists(app: &AppState, club_id: i64) -> Result<bool, AppError> {
    Ok(
        sqlx::query_scalar!(r#"SELECT 1 AS "x!: i64" FROM clubs WHERE id = ?"#, club_id)
            .fetch_optional(&app.pool)
            .await?
            .is_some(),
    )
}

async fn is_member(app: &AppState, user_id: i64, club_id: i64) -> Result<bool, AppError> {
    let row = sqlx::query_scalar!(
        "SELECT is_member FROM members WHERE user_id = ? AND club_id = ? LIMIT 1",
        user_id,
        club_id
    )
    .fetch_optional(&app.pool)
    .await?;
    Ok(row.map(|m| m != 0).unwrap_or(false))
}

async fn is_admin(app: &AppState, user_id: i64, club_id: i64) -> Result<bool, AppError> {
    let row = sqlx::query_scalar!(
        "SELECT is_admin FROM members WHERE user_id = ? AND club_id = ? LIMIT 1",
        user_id,
        club_id
    )
    .fetch_optional(&app.pool)
    .await?;
    Ok(row.map(|a| a != 0).unwrap_or(false))
}

/// `IsClubAdmin`: 403 unless `user_id` administers `club_id` (club must exist).
async fn require_admin(app: &AppState, user_id: i64, club_id: i64) -> Result<(), AppError> {
    if !club_exists(app, club_id).await? {
        return Err(AppError::NotFound(
            "No ClubModel matches the given query.".into(),
        ));
    }
    if is_admin(app, user_id, club_id).await? {
        Ok(())
    } else {
        Err(AppError::Forbidden(
            "You do not have permission to perform this action.".into(),
        ))
    }
}

/// `IsClubMember`: 403 unless `user_id` is a member of `club_id`.
async fn require_member(app: &AppState, user_id: i64, club_id: i64) -> Result<(), AppError> {
    if !club_exists(app, club_id).await? {
        return Err(AppError::NotFound(
            "No ClubModel matches the given query.".into(),
        ));
    }
    if is_member(app, user_id, club_id).await? {
        Ok(())
    } else {
        Err(AppError::Forbidden(
            "You do not have permission to perform this action.".into(),
        ))
    }
}

/// Fetch an event's `club_id` or 404.
async fn event_club_id(app: &AppState, event_id: i64) -> Result<i64, AppError> {
    sqlx::query_scalar!(
        r#"SELECT club_id AS "club_id!: i64" FROM events WHERE id = ?"#,
        event_id
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No Event matches the given query.".into()))
}

// ===========================================================================
// Response shapes (mirror the Django serializers exactly).
// ===========================================================================

#[derive(Debug, Serialize)]
pub struct GameTypeField {
    name: String,
}

/// `EventClubSerializer`.
#[derive(Debug, Serialize)]
pub struct EventClub {
    id: ClubId,
    name: String,
    logo: Option<String>,
}

/// `EventSerializer`.
#[derive(Debug, Serialize)]
pub struct EventListItem {
    id: EventId,
    date: String,
    start_time: String,
    finish_time: String,
    number_of_courts: i64,
    sbmm: bool,
    guests_allowed: bool,
    over_18_under_18_mixed: Option<String>,
    event_active: bool,
    event_complete: bool,
    club: EventClub,
    game_type: Option<GameTypeField>,
}

/// `MemberBasicSerializer` (subset used by the event detail).
#[derive(Debug, Serialize)]
pub struct MemberBasic {
    id: MemberId,
    first_name: Option<String>,
    surname: Option<String>,
    username: String,
    is_club_admin: bool,
}

/// `EventDetailSerializer`.
#[derive(Debug, Serialize)]
pub struct EventDetail {
    id: EventId,
    game_type: Option<GameTypeField>,
    date: String,
    start_time: String,
    finish_time: String,
    number_of_courts: i64,
    sbmm: bool,
    guests_allowed: bool,
    over_18_under_18_mixed: Option<String>,
    active_members: Vec<MemberBasic>,
    in_game_members: Vec<MemberBasic>,
    event_active: bool,
    event_complete: bool,
    mode: String,
    even_teams: bool,
    team_size: Option<i64>,
}

/// `EventSettingsSerializer`.
#[derive(Debug, Serialize)]
pub struct EventSettings {
    sbmm: bool,
    mode: String,
    even_teams: bool,
}

/// `EventStatsSerializer`.
#[derive(Debug, Serialize)]
pub struct EventStats {
    best_winstreak_players: Vec<Value>,
    highest_win_rate_players: Vec<Value>,
    most_wins_players: Vec<Value>,
    most_games_played_players: Vec<Value>,
    highest_elo_gain_players: Vec<Value>,
}

// ===========================================================================
// Row -> serializer helpers
// ===========================================================================

fn logo_url(app: &AppState, key: Option<String>) -> Option<String> {
    key.map(|k| {
        app.storage
            .signed_url(&k, crate::media::DEFAULT_URL_TTL_SECS)
    })
}

/// Full display name `"{first_name} {surname}"` for a member id, mirroring the
/// f-strings in `EventStatsSerializer`. Missing names render as the empty string.
async fn member_name(app: &AppState, member_id: i64) -> Result<String, AppError> {
    let row = sqlx::query!(
        r#"SELECT u.first_name, u.surname
           FROM members m JOIN users u ON u.id = m.user_id WHERE m.id = ?"#,
        member_id
    )
    .fetch_optional(&app.pool)
    .await?;
    let (first, surname) = match row {
        Some(r) => (
            r.first_name.unwrap_or_default(),
            r.surname.unwrap_or_default(),
        ),
        None => (String::new(), String::new()),
    };
    Ok(format!("{first} {surname}"))
}

#[derive(Clone, Copy)]
enum EventMemberTable {
    Active,
    InGame,
}

/// Load the members on one side of an event's M2M (active / in-game), shaped as
/// `MemberBasicSerializer`.
async fn load_event_members(
    app: &AppState,
    event_id: i64,
    table: EventMemberTable,
) -> Result<Vec<MemberBasic>, AppError> {
    // Two near-identical queries (one per join table) so the `query!` macro can
    // verify each at compile time. Each arm maps to `MemberBasic` directly, since
    // the macro mints a distinct anonymous row struct per call site.
    let out = match table {
        EventMemberTable::Active => sqlx::query!(
            r#"SELECT m.id AS "id!: i64", m.is_admin AS "is_admin!: i64",
                      u.first_name, u.surname, u.username AS "username!: String"
               FROM event_active_members em
               JOIN members m ON m.id = em.member_id
               JOIN users u ON u.id = m.user_id
               WHERE em.event_id = ? ORDER BY m.id"#,
            event_id
        )
        .fetch_all(&app.pool)
        .await?
        .into_iter()
        .map(|r| MemberBasic {
            id: r.id.into(),
            first_name: r.first_name,
            surname: r.surname,
            username: r.username,
            is_club_admin: r.is_admin != 0,
        })
        .collect(),
        EventMemberTable::InGame => sqlx::query!(
            r#"SELECT m.id AS "id!: i64", m.is_admin AS "is_admin!: i64",
                      u.first_name, u.surname, u.username AS "username!: String"
               FROM event_in_game_members em
               JOIN members m ON m.id = em.member_id
               JOIN users u ON u.id = m.user_id
               WHERE em.event_id = ? ORDER BY m.id"#,
            event_id
        )
        .fetch_all(&app.pool)
        .await?
        .into_iter()
        .map(|r| MemberBasic {
            id: r.id.into(),
            first_name: r.first_name,
            surname: r.surname,
            username: r.username,
            is_club_admin: r.is_admin != 0,
        })
        .collect(),
    };
    Ok(out)
}

// ===========================================================================
// Handlers
// ===========================================================================

/// A flat event row reused by the list/detail builders.
struct EventRow {
    id: i64,
    date: String,
    start_time: String,
    finish_time: String,
    number_of_courts: i64,
    sbmm: i64,
    guests_allowed: i64,
    over_18_under_18_mixed: Option<String>,
    event_active: i64,
    event_complete: i64,
    game_type_name: Option<String>,
}

/// Build an `EventListItem` (`EventSerializer`) from a row + its club.
fn event_list_item(r: EventRow, club: EventClub) -> EventListItem {
    EventListItem {
        id: r.id.into(),
        date: r.date,
        start_time: r.start_time,
        finish_time: r.finish_time,
        number_of_courts: r.number_of_courts,
        sbmm: r.sbmm != 0,
        guests_allowed: r.guests_allowed != 0,
        over_18_under_18_mixed: r.over_18_under_18_mixed,
        event_active: r.event_active != 0,
        event_complete: r.event_complete != 0,
        club,
        game_type: r.game_type_name.map(|name| GameTypeField { name }),
    }
}

/// Is `start_time` (`HH:MM[:SS]`) earlier than or equal to the current UTC time?
/// The legacy combines *today* with the event's start time and compares to now.
fn start_time_before_now(start_time: &str) -> bool {
    let now_t = now().time();
    let parse = |s: &str| -> Option<(u8, u8)> {
        let mut parts = s.split(':');
        let h = parts.next()?.parse().ok()?;
        let m = parts.next()?.parse().ok()?;
        Some((h, m))
    };
    match parse(start_time) {
        Some((h, m)) => (now_t.hour(), now_t.minute()) >= (h, m),
        None => false,
    }
}

/// Lazily generate concrete `events` rows for a club's active series, up to a
/// rolling horizon. Idempotent: `generated_through` watermarks the furthest date
/// processed, so repeated listings never duplicate instances, and instances that
/// `auto_manage_events` later auto-deletes (empty + completed) are not recreated.
/// Occurrences strictly in the past are skipped (no backlog) but still advance
/// the watermark to keep the cadence aligned to `start_date`.
async fn materialize_series(app: &AppState, club_id: i64) -> Result<(), AppError> {
    let today = now().date();
    let horizon = today + Duration::days(MATERIALIZE_HORIZON_DAYS);

    let series = sqlx::query!(
        r#"SELECT id AS "id!: i64", game_type_id AS "game_type_id?: i64",
                  start_time, finish_time,
                  number_of_courts AS "number_of_courts!: i64",
                  sbmm AS "sbmm!: i64", guests_allowed AS "guests_allowed!: i64",
                  over_18_under_18_mixed, frequency,
                  interval AS "interval!: i64", start_date, end_date,
                  generated_through
           FROM event_series WHERE club_id = ? AND is_active = 1"#,
        club_id
    )
    .fetch_all(&app.pool)
    .await?;

    for s in series {
        let (Some(start), Some(end)) = (parse_date(&s.start_date), parse_date(&s.end_date)) else {
            continue;
        };
        let limit = end.min(horizon);
        // Resume after the watermark; otherwise begin at the series start.
        let mut date = match s.generated_through.as_deref().and_then(parse_date) {
            Some(g) => match next_occurrence(g, &s.frequency, s.interval) {
                Some(d) => d,
                None => continue,
            },
            None => start,
        };

        let mut watermark: Option<Date> = None;
        while date <= limit {
            let date_str = date.to_string();
            if date >= today {
                sqlx::query!(
                    r#"INSERT INTO events
                        (club_id, game_type_id, date, start_time, finish_time,
                         number_of_courts, sbmm, guests_allowed,
                         over_18_under_18_mixed, series_id)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
                    club_id,
                    s.game_type_id,
                    date_str,
                    s.start_time,
                    s.finish_time,
                    s.number_of_courts,
                    s.sbmm,
                    s.guests_allowed,
                    s.over_18_under_18_mixed,
                    s.id,
                )
                .execute(&app.pool)
                .await?;
            }
            watermark = Some(date);
            date = match next_occurrence(date, &s.frequency, s.interval) {
                Some(d) => d,
                None => break,
            };
        }

        if let Some(w) = watermark {
            let w_str = w.to_string();
            sqlx::query!(
                "UPDATE event_series SET generated_through = ? WHERE id = ?",
                w_str,
                s.id
            )
            .execute(&app.pool)
            .await?;
        }
    }
    Ok(())
}

/// Lazily auto-manage a club's events (port of `auto_manage_events`): activate
/// past events whose start has passed, complete events 2+ days old, and delete
/// completed empty events. Runs before listing, matching the legacy view.
async fn auto_manage_events(app: &AppState, club_id: i64) -> Result<(), AppError> {
    // Top up recurring series before auto-managing, so freshly generated
    // instances are activated/completed in the same pass.
    materialize_series(app, club_id).await?;

    let today = now().date();
    let rows = sqlx::query!(
        r#"SELECT id AS "id!: i64", date, start_time,
                  event_active AS "event_active!: i64",
                  event_complete AS "event_complete!: i64"
           FROM events WHERE club_id = ?"#,
        club_id
    )
    .fetch_all(&app.pool)
    .await?;

    for r in rows {
        let Some(date) = parse_date(&r.date) else {
            continue;
        };
        let event_active = r.event_active != 0;
        let mut event_complete = r.event_complete != 0;

        if should_activate(
            event_active,
            date,
            today,
            start_time_before_now(&r.start_time),
        ) {
            sqlx::query!("UPDATE events SET event_active = 1 WHERE id = ?", r.id)
                .execute(&app.pool)
                .await?;
        }

        if should_complete(event_complete, date, today) {
            sqlx::query!("UPDATE events SET event_complete = 1 WHERE id = ?", r.id)
                .execute(&app.pool)
                .await?;
            event_complete = true;
        }

        if event_complete && date + Duration::days(2) < today {
            let games = sqlx::query_scalar!(
                r#"SELECT COUNT(*) AS "c!: i64" FROM event_games WHERE event_id = ?"#,
                r.id
            )
            .fetch_one(&app.pool)
            .await?;
            if games == 0 {
                sqlx::query!("DELETE FROM events WHERE id = ?", r.id)
                    .execute(&app.pool)
                    .await?;
            }
        }
    }
    Ok(())
}

/// GET /api/events/:pk — events for a club (`EventSerializer` list).
pub async fn club_events(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
) -> Result<Json<Vec<EventListItem>>, AppError> {
    let pk = pk.inner();
    require_member(&app, user.id, pk).await?;
    auto_manage_events(&app, pk).await?;

    let club = sqlx::query!(
        r#"SELECT id AS "id!: i64", name, logo FROM clubs WHERE id = ?"#,
        pk
    )
    .fetch_one(&app.pool)
    .await?;

    let rows = sqlx::query!(
        r#"SELECT e.id AS "id!: i64", e.date, e.start_time, e.finish_time,
                  e.number_of_courts AS "number_of_courts!: i64",
                  e.sbmm AS "sbmm!: i64", e.guests_allowed AS "guests_allowed!: i64",
                  e.over_18_under_18_mixed, e.event_active AS "event_active!: i64",
                  e.event_complete AS "event_complete!: i64",
                  gt.name AS "game_type_name?: String"
           FROM events e
           LEFT JOIN game_types gt ON gt.id = e.game_type_id
           WHERE e.club_id = ? ORDER BY e.id"#,
        pk
    )
    .fetch_all(&app.pool)
    .await?;

    let logo = logo_url(&app, club.logo);
    let out = rows
        .into_iter()
        .map(|r| {
            let row = EventRow {
                id: r.id,
                date: r.date,
                start_time: r.start_time,
                finish_time: r.finish_time,
                number_of_courts: r.number_of_courts,
                sbmm: r.sbmm,
                guests_allowed: r.guests_allowed,
                over_18_under_18_mixed: r.over_18_under_18_mixed,
                event_active: r.event_active,
                event_complete: r.event_complete,
                game_type_name: r.game_type_name,
            };
            event_list_item(
                row,
                EventClub {
                    id: club.id.into(),
                    name: club.name.clone(),
                    logo: logo.clone(),
                },
            )
        })
        .collect();
    Ok(Json(out))
}

/// GET /api/events/ — the authenticated user's events across club memberships,
/// sorted by (date, start_time) descending (port of `get_events_for_user`).
pub async fn my_events(
    State(app): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<EventListItem>>, AppError> {
    let rows = sqlx::query!(
        r#"SELECT e.id AS "id!: i64", e.date, e.start_time, e.finish_time,
                  e.number_of_courts AS "number_of_courts!: i64",
                  e.sbmm AS "sbmm!: i64", e.guests_allowed AS "guests_allowed!: i64",
                  e.over_18_under_18_mixed, e.event_active AS "event_active!: i64",
                  e.event_complete AS "event_complete!: i64",
                  gt.name AS "game_type_name?: String",
                  c.id AS "club_id!: i64", c.name AS "club_name!: String",
                  c.logo AS "club_logo?: String"
           FROM members mem
           JOIN events e ON e.club_id = mem.club_id
           JOIN clubs c ON c.id = e.club_id
           LEFT JOIN game_types gt ON gt.id = e.game_type_id
           WHERE mem.user_id = ?
           ORDER BY e.date DESC, e.start_time DESC, e.id DESC"#,
        user.id
    )
    .fetch_all(&app.pool)
    .await?;

    let out = rows
        .into_iter()
        .map(|r| {
            let logo = logo_url(&app, r.club_logo);
            let row = EventRow {
                id: r.id,
                date: r.date,
                start_time: r.start_time,
                finish_time: r.finish_time,
                number_of_courts: r.number_of_courts,
                sbmm: r.sbmm,
                guests_allowed: r.guests_allowed,
                over_18_under_18_mixed: r.over_18_under_18_mixed,
                event_active: r.event_active,
                event_complete: r.event_complete,
                game_type_name: r.game_type_name,
            };
            event_list_item(
                row,
                EventClub {
                    id: r.club_id.into(),
                    name: r.club_name,
                    logo,
                },
            )
        })
        .collect();
    Ok(Json(out))
}

/// GET /api/event/:pk1 — full event detail (`EventDetailSerializer`).
pub async fn event_detail(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk1): ApiPath<EventId>,
) -> Result<Json<EventDetail>, AppError> {
    let pk1 = pk1.inner();
    let club_id = event_club_id(&app, pk1).await?;
    require_member(&app, user.id, club_id).await?;

    let r = sqlx::query!(
        r#"SELECT e.id AS "id!: i64", e.date, e.start_time, e.finish_time,
                  e.number_of_courts AS "number_of_courts!: i64",
                  e.sbmm AS "sbmm!: i64", e.guests_allowed AS "guests_allowed!: i64",
                  e.over_18_under_18_mixed, e.event_active AS "event_active!: i64",
                  e.event_complete AS "event_complete!: i64", e.mode,
                  e.even_teams AS "even_teams!: i64",
                  gt.name AS "game_type_name?: String"
           FROM events e
           LEFT JOIN game_types gt ON gt.id = e.game_type_id
           WHERE e.id = ?"#,
        pk1
    )
    .fetch_one(&app.pool)
    .await?;

    let active_members = load_event_members(&app, pk1, EventMemberTable::Active).await?;
    let in_game_members = load_event_members(&app, pk1, EventMemberTable::InGame).await?;
    let team_size = number_in_team(r.game_type_name.as_deref());

    Ok(Json(EventDetail {
        id: r.id.into(),
        game_type: r.game_type_name.map(|name| GameTypeField { name }),
        date: r.date,
        start_time: r.start_time,
        finish_time: r.finish_time,
        number_of_courts: r.number_of_courts,
        sbmm: r.sbmm != 0,
        guests_allowed: r.guests_allowed != 0,
        over_18_under_18_mixed: r.over_18_under_18_mixed,
        active_members,
        in_game_members,
        event_active: r.event_active != 0,
        event_complete: r.event_complete != 0,
        mode: r.mode,
        even_teams: r.even_teams != 0,
        team_size,
    }))
}

#[derive(Deserialize)]
pub struct CreateEventRequest {
    game_type: Option<String>,
    date: Option<String>,
    start_time: Option<String>,
    finish_time: Option<String>,
    number_of_courts: Option<i64>,
    #[serde(default)]
    sbmm: Option<bool>,
    #[serde(default)]
    guests_allowed: Option<bool>,
    over_18_under_18_mixed: Option<String>,
}

/// POST /api/event/create/:pk — create an event for club `pk` (admin only).
/// Mirrors `EventCreateView` + `services.create_event`; returns `EventSerializer`.
pub async fn create_event(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
    Json(req): Json<CreateEventRequest>,
) -> Result<(StatusCode, Json<EventListItem>), AppError> {
    let pk = pk.inner();
    require_admin(&app, user.id, pk).await?;

    let (Some(date), Some(start_time), Some(finish_time), Some(number_of_courts)) = (
        req.date,
        req.start_time,
        req.finish_time,
        req.number_of_courts,
    ) else {
        return Err(AppError::Validation("This field is required.".into()));
    };

    // `create_event` resolves the game type by name (404 if unknown).
    let game_type_id = match req.game_type.as_deref() {
        Some(name) => Some(
            sqlx::query_scalar!("SELECT id FROM game_types WHERE name = ?", name)
                .fetch_optional(&app.pool)
                .await?
                .ok_or_else(|| AppError::NotFound("No GameType matches the given query.".into()))?,
        ),
        None => None,
    };

    let sbmm = i64::from(req.sbmm.unwrap_or(true));
    let guests = i64::from(req.guests_allowed.unwrap_or(false));
    let mixed = req.over_18_under_18_mixed.unwrap_or_default();

    let event_id = sqlx::query_scalar!(
        r#"INSERT INTO events
            (club_id, game_type_id, date, start_time, finish_time, number_of_courts,
             sbmm, guests_allowed, over_18_under_18_mixed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id AS "id!: i64""#,
        pk,
        game_type_id,
        date,
        start_time,
        finish_time,
        number_of_courts,
        sbmm,
        guests,
        mixed
    )
    .fetch_one(&app.pool)
    .await?;

    let club = sqlx::query!(
        r#"SELECT id AS "id!: i64", name, logo FROM clubs WHERE id = ?"#,
        pk
    )
    .fetch_one(&app.pool)
    .await?;
    let game_type_name = match game_type_id {
        Some(gt) => {
            sqlx::query_scalar!("SELECT name FROM game_types WHERE id = ?", gt)
                .fetch_optional(&app.pool)
                .await?
        }
        None => None,
    };

    let row = EventRow {
        id: event_id,
        date,
        start_time,
        finish_time,
        number_of_courts,
        sbmm,
        guests_allowed: guests,
        over_18_under_18_mixed: Some(mixed),
        event_active: 0,
        event_complete: 0,
        game_type_name,
    };
    let item = event_list_item(
        row,
        EventClub {
            id: club.id.into(),
            name: club.name,
            logo: logo_url(&app, club.logo),
        },
    );
    Ok((StatusCode::CREATED, Json(item)))
}

#[derive(Deserialize)]
pub struct CreateSeriesRequest {
    game_type: Option<String>,
    start_time: Option<String>,
    finish_time: Option<String>,
    number_of_courts: Option<i64>,
    #[serde(default)]
    sbmm: Option<bool>,
    #[serde(default)]
    guests_allowed: Option<bool>,
    over_18_under_18_mixed: Option<String>,
    frequency: Option<String>,
    #[serde(default)]
    interval: Option<i64>,
    start_date: Option<String>,
    end_date: Option<String>,
}

/// Response for series creation: the new series id plus the instances generated
/// within the materialization horizon.
#[derive(Debug, Serialize)]
pub struct SeriesCreated {
    series_id: SeriesId,
    events: Vec<EventListItem>,
}

/// POST /api/event/series/create/:pk — create a recurring event series for club
/// `pk` (admin only). Inserts the series template + rule, materializes the first
/// instances, and returns the series id with those instances.
pub async fn create_series(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
    Json(req): Json<CreateSeriesRequest>,
) -> Result<(StatusCode, Json<SeriesCreated>), AppError> {
    let pk = pk.inner();
    require_admin(&app, user.id, pk).await?;

    let (
        Some(start_time),
        Some(finish_time),
        Some(number_of_courts),
        Some(frequency),
        Some(start_date),
        Some(end_date),
    ) = (
        req.start_time,
        req.finish_time,
        req.number_of_courts,
        req.frequency,
        req.start_date,
        req.end_date,
    )
    else {
        return Err(AppError::Validation("This field is required.".into()));
    };

    if !matches!(frequency.as_str(), "daily" | "weekly" | "monthly") {
        return Err(AppError::Validation(
            "frequency must be daily, weekly or monthly.".into(),
        ));
    }
    let interval = req.interval.unwrap_or(1).max(1);
    let (Some(start), Some(end)) = (parse_date(&start_date), parse_date(&end_date)) else {
        return Err(AppError::Validation("Invalid date.".into()));
    };
    if end < start {
        return Err(AppError::Validation(
            "end_date must not be before start_date.".into(),
        ));
    }

    let game_type_id = match req.game_type.as_deref() {
        Some(name) => Some(
            sqlx::query_scalar!("SELECT id FROM game_types WHERE name = ?", name)
                .fetch_optional(&app.pool)
                .await?
                .ok_or_else(|| AppError::NotFound("No GameType matches the given query.".into()))?,
        ),
        None => None,
    };

    let sbmm = i64::from(req.sbmm.unwrap_or(true));
    let guests = i64::from(req.guests_allowed.unwrap_or(false));
    let mixed = req.over_18_under_18_mixed.unwrap_or_default();

    let series_id = sqlx::query_scalar!(
        r#"INSERT INTO event_series
            (club_id, game_type_id, start_time, finish_time, number_of_courts,
             sbmm, guests_allowed, over_18_under_18_mixed, frequency, interval,
             start_date, end_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id AS "id!: i64""#,
        pk,
        game_type_id,
        start_time,
        finish_time,
        number_of_courts,
        sbmm,
        guests,
        mixed,
        frequency,
        interval,
        start_date,
        end_date,
    )
    .fetch_one(&app.pool)
    .await?;

    // Generate the first instances now so the caller can show them immediately.
    materialize_series(&app, pk).await?;

    let club = sqlx::query!(
        r#"SELECT id AS "id!: i64", name, logo FROM clubs WHERE id = ?"#,
        pk
    )
    .fetch_one(&app.pool)
    .await?;
    let logo = logo_url(&app, club.logo);

    let rows = sqlx::query!(
        r#"SELECT e.id AS "id!: i64", e.date, e.start_time, e.finish_time,
                  e.number_of_courts AS "number_of_courts!: i64",
                  e.sbmm AS "sbmm!: i64", e.guests_allowed AS "guests_allowed!: i64",
                  e.over_18_under_18_mixed, e.event_active AS "event_active!: i64",
                  e.event_complete AS "event_complete!: i64",
                  gt.name AS "game_type_name?: String"
           FROM events e
           LEFT JOIN game_types gt ON gt.id = e.game_type_id
           WHERE e.series_id = ? ORDER BY e.date"#,
        series_id
    )
    .fetch_all(&app.pool)
    .await?;

    let events = rows
        .into_iter()
        .map(|r| {
            let row = EventRow {
                id: r.id,
                date: r.date,
                start_time: r.start_time,
                finish_time: r.finish_time,
                number_of_courts: r.number_of_courts,
                sbmm: r.sbmm,
                guests_allowed: r.guests_allowed,
                over_18_under_18_mixed: r.over_18_under_18_mixed,
                event_active: r.event_active,
                event_complete: r.event_complete,
                game_type_name: r.game_type_name,
            };
            event_list_item(
                row,
                EventClub {
                    id: club.id.into(),
                    name: club.name.clone(),
                    logo: logo.clone(),
                },
            )
        })
        .collect();

    Ok((
        StatusCode::CREATED,
        Json(SeriesCreated {
            series_id: series_id.into(),
            events,
        }),
    ))
}

/// DELETE /api/event/series/:series_id — cancel a series (admin only):
/// deactivate it and drop future instances that have no recorded games.
pub async fn cancel_series(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(series_id): ApiPath<SeriesId>,
) -> Result<Json<Value>, AppError> {
    let series_id = series_id.inner();
    let club_id = sqlx::query_scalar!(
        r#"SELECT club_id AS "club_id!: i64" FROM event_series WHERE id = ?"#,
        series_id
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No EventSeries matches the given query.".into()))?;
    require_admin(&app, user.id, club_id).await?;

    sqlx::query!(
        "UPDATE event_series SET is_active = 0 WHERE id = ?",
        series_id
    )
    .execute(&app.pool)
    .await?;

    let today = now().date().to_string();
    sqlx::query!(
        r#"DELETE FROM events
           WHERE series_id = ? AND date > ?
             AND id NOT IN (SELECT event_id FROM event_games)"#,
        series_id,
        today
    )
    .execute(&app.pool)
    .await?;

    Ok(Json(json!({ "detail": "Series cancelled." })))
}

#[derive(Deserialize)]
pub struct MemberActionRequest {
    event_id: Option<EventId>,
    member_id: Option<MemberId>,
}

/// Ensure an ELO row exists for the event's game type, snapshot `initial_elo`
/// once, seed the member's match count to the current minimum if they haven't
/// played yet, then add them to the active set (idempotent). Shared seeding path
/// for both `activate_member` and `invite_member`. Assumes the caller has already
/// performed the admin authorization check.
async fn add_member_to_active_set(
    app: &AppState,
    event_id: i64,
    member_id: i64,
) -> Result<(), AppError> {
    let event = sqlx::query!(
        r#"SELECT game_type_id AS "game_type_id?: i64",
                  initial_elo, player_match_counts
           FROM events WHERE id = ?"#,
        event_id
    )
    .fetch_one(&app.pool)
    .await?;

    let member = sqlx::query!(
        r#"SELECT user_id AS "user_id!: i64" FROM members WHERE id = ?"#,
        member_id
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No Member matches the given query.".into()))?;

    // Ensure the user has an ELO row for the game type, creating one if needed,
    // then snapshot the initial ELO once.
    let mut initial_elo = parse_int_map(&event.initial_elo);
    if let Some(game_type_id) = event.game_type_id {
        let existing = sqlx::query_scalar!(
            r#"SELECT e.elo AS "elo!: i64"
               FROM user_elos ue JOIN elo e ON e.id = ue.elo_id
               WHERE ue.user_id = ? AND e.game_type_id = ? AND e.scope = 'internal' LIMIT 1"#,
            member.user_id,
            game_type_id
        )
        .fetch_optional(&app.pool)
        .await?;
        let elo_value = match existing {
            Some(v) => v,
            None => {
                let last_game = fmt_ts(now())?;
                let new_elo_id = sqlx::query_scalar!(
                    r#"INSERT INTO elo (game_type_id, last_game) VALUES (?, ?)
                       RETURNING id AS "id!: i64""#,
                    game_type_id,
                    last_game
                )
                .fetch_one(&app.pool)
                .await?;
                sqlx::query!(
                    "INSERT INTO user_elos (user_id, elo_id) VALUES (?, ?)",
                    member.user_id,
                    new_elo_id
                )
                .execute(&app.pool)
                .await?;
                sqlx::query_scalar!(
                    r#"SELECT elo AS "elo!: i64" FROM elo WHERE id = ?"#,
                    new_elo_id
                )
                .fetch_one(&app.pool)
                .await?
            }
        };
        // Snapshot initial_elo only if not already set (legacy `if not ...`).
        if initial_elo
            .get(&member_id.to_string())
            .copied()
            .unwrap_or(0)
            == 0
        {
            initial_elo.insert(member_id.to_string(), elo_value);
            persist_int_map(app, event_id, StatColumn::InitialElo, &initial_elo).await?;
        }
    }

    // Seed match count to the current minimum if the member hasn't played yet.
    let played = sqlx::query_scalar!(
        r#"SELECT 1 AS "x!: i64" FROM event_played_one_match
           WHERE event_id = ? AND member_id = ? LIMIT 1"#,
        event_id,
        member_id
    )
    .fetch_optional(&app.pool)
    .await?
    .is_some();
    if !played {
        let mut counts = parse_int_map(&event.player_match_counts);
        let minima = min_matches(&counts);
        counts.insert(member_id.to_string(), minima);
        persist_int_map(app, event_id, StatColumn::PlayerMatchCounts, &counts).await?;
    }

    // Add to the active set (idempotent).
    sqlx::query!(
        "INSERT OR IGNORE INTO event_active_members (event_id, member_id) VALUES (?, ?)",
        event_id,
        member_id
    )
    .execute(&app.pool)
    .await?;

    Ok(())
}

/// POST /api/event/activate-member — add a member to the active set (admin).
/// Port of `ActivateMemberSerializer`: ensures an ELO row exists for the event's
/// game type, snapshots `initial_elo` once, and seeds the player's match count to
/// the current minimum if they haven't yet played a match.
pub async fn activate_member(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<MemberActionRequest>,
) -> Result<Json<Value>, AppError> {
    let (Some(event_id), Some(member_id)) = (req.event_id, req.member_id) else {
        return Err(AppError::Validation("This field is required.".into()));
    };
    let event_id = event_id.inner();
    let member_id = member_id.inner();
    let club_id = event_club_id(&app, event_id).await?;
    require_admin(&app, user.id, club_id).await?;

    add_member_to_active_set(&app, event_id, member_id).await?;

    Ok(Json(json!({ "message": "Member activated successfully" })))
}

#[derive(Deserialize)]
pub struct InviteMemberRequest {
    event_id: Option<EventId>,
    user_id: Option<UserId>,
}

/// POST /api/event/invite-member — invite a platform user (not yet in the club)
/// to the club and add them to the event's active set in one step (admin only).
///
/// Records a pending club-membership invite (`member_requests`, awaiting the
/// user's consent to fully join) and creates an event-participation membership
/// row (`is_member = 0`) so they can play tonight; accepting the request later
/// upgrades them to a full member (`is_member = 1`).
pub async fn invite_member(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<InviteMemberRequest>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    let (Some(event_id), Some(target_user_id)) = (req.event_id, req.user_id) else {
        return Err(AppError::Validation("This field is required.".into()));
    };
    let event_id = event_id.inner();
    let target_user_id = target_user_id.inner();
    let club_id = event_club_id(&app, event_id).await?;
    require_admin(&app, user.id, club_id).await?;

    // The target must be a real, active user.
    let exists = sqlx::query_scalar!(
        r#"SELECT 1 AS "x!: i64" FROM users WHERE id = ? AND is_active = 1 LIMIT 1"#,
        target_user_id
    )
    .fetch_optional(&app.pool)
    .await?
    .is_some();
    if !exists {
        return Err(AppError::NotFound(
            "No User matches the given query.".into(),
        ));
    }

    let now_ts = fmt_ts(now())?;
    // Pending club-membership invite (idempotent via UNIQUE(club_id, user_id)).
    sqlx::query!(
        "INSERT OR IGNORE INTO member_requests (club_id, user_id, date_requested)
         VALUES (?, ?, ?)",
        club_id,
        target_user_id,
        now_ts
    )
    .execute(&app.pool)
    .await?;

    // Reuse an existing membership row if any (never downgrade a real member);
    // otherwise create an event-participation row with is_member = 0.
    let member_id = match sqlx::query_scalar!(
        r#"SELECT id AS "id!: i64" FROM members WHERE club_id = ? AND user_id = ? LIMIT 1"#,
        club_id,
        target_user_id
    )
    .fetch_optional(&app.pool)
    .await?
    {
        Some(id) => id,
        None => {
            sqlx::query_scalar!(
                r#"INSERT INTO members (club_id, user_id, is_member, is_admin, date_joined)
                   VALUES (?, ?, 0, 0, ?) RETURNING id AS "id!: i64""#,
                club_id,
                target_user_id,
                now_ts
            )
            .fetch_one(&app.pool)
            .await?
        }
    };

    add_member_to_active_set(&app, event_id, member_id).await?;

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "member_id": MemberId::from(member_id),
            "message": "Invited and added to the event.",
        })),
    ))
}

/// POST /api/event/deactivate-member — remove a member from the active set.
pub async fn deactivate_member(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<MemberActionRequest>,
) -> Result<Json<Value>, AppError> {
    let (Some(event_id), Some(member_id)) = (req.event_id, req.member_id) else {
        return Err(AppError::Validation("This field is required.".into()));
    };
    let event_id = event_id.inner();
    let member_id = member_id.inner();
    let club_id = event_club_id(&app, event_id).await?;
    require_admin(&app, user.id, club_id).await?;

    sqlx::query!(
        "DELETE FROM event_active_members WHERE event_id = ? AND member_id = ?",
        event_id,
        member_id
    )
    .execute(&app.pool)
    .await?;
    Ok(Json(
        json!({ "message": "Member deactivated successfully" }),
    ))
}

#[derive(Deserialize)]
pub struct EventActionRequest {
    event_id: Option<EventId>,
}

/// POST /api/event/start — mark an event active (admin). Errors if already active
/// (mirrors `StartEventSerializer`).
pub async fn start_event(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<EventActionRequest>,
) -> Result<Json<Value>, AppError> {
    let Some(event_id) = req.event_id else {
        return Err(AppError::Validation("This field is required.".into()));
    };
    let event_id = event_id.inner();
    let club_id = event_club_id(&app, event_id).await?;
    require_admin(&app, user.id, club_id).await?;

    let active = sqlx::query_scalar!(
        r#"SELECT event_active AS "a!: i64" FROM events WHERE id = ?"#,
        event_id
    )
    .fetch_one(&app.pool)
    .await?;
    if active != 0 {
        return Err(AppError::Validation("Event is already active".into()));
    }
    sqlx::query!("UPDATE events SET event_active = 1 WHERE id = ?", event_id)
        .execute(&app.pool)
        .await?;
    Ok(Json(json!({ "message": "Event started successfully" })))
}

/// POST /api/event/complete — toggle complete status (admin). On completion,
/// snapshot `final_elo` for every member with an `initial_elo` snapshot
/// (mirrors `CompleteEventSerializer` + `Event.update_final_elo`).
pub async fn complete_event(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<EventActionRequest>,
) -> Result<Json<Value>, AppError> {
    let Some(event_id) = req.event_id else {
        return Err(AppError::Validation("This field is required.".into()));
    };
    let event_id = event_id.inner();
    let club_id = event_club_id(&app, event_id).await?;
    require_admin(&app, user.id, club_id).await?;

    let event = sqlx::query!(
        r#"SELECT event_complete AS "complete!: i64",
                  game_type_id AS "game_type_id?: i64", initial_elo
           FROM events WHERE id = ?"#,
        event_id
    )
    .fetch_one(&app.pool)
    .await?;

    let new_complete = i64::from(event.complete == 0);
    sqlx::query!(
        "UPDATE events SET event_complete = ? WHERE id = ?",
        new_complete,
        event_id
    )
    .execute(&app.pool)
    .await?;

    if new_complete != 0 {
        let initial = parse_int_map(&event.initial_elo);
        let mut final_elo: BTreeMap<String, i64> = BTreeMap::new();
        for key in initial.keys() {
            let member_id: i64 = match key.parse() {
                Ok(id) => id,
                Err(_) => continue,
            };
            let member = sqlx::query!(
                r#"SELECT user_id AS "user_id!: i64" FROM members WHERE id = ?"#,
                member_id
            )
            .fetch_optional(&app.pool)
            .await?;
            let Some(member) = member else { continue };
            let elo = match event.game_type_id {
                Some(gt) => {
                    sqlx::query_scalar!(
                        r#"SELECT e.elo AS "elo!: i64" FROM user_elos ue
                       JOIN elo e ON e.id = ue.elo_id
                       WHERE ue.user_id = ? AND e.game_type_id = ? AND e.scope = 'internal' LIMIT 1"#,
                        member.user_id,
                        gt
                    )
                    .fetch_optional(&app.pool)
                    .await?
                }
                None => None,
            };
            if let Some(elo) = elo {
                final_elo.insert(key.clone(), elo);
            }
        }
        persist_int_map(&app, event_id, StatColumn::FinalElo, &final_elo).await?;
    }

    Ok(Json(
        json!({ "message": "Event complete status successfully reversed." }),
    ))
}

#[derive(Deserialize)]
pub struct EventSettingsUpdate {
    sbmm: Option<bool>,
    mode: Option<String>,
    even_teams: Option<bool>,
}

/// PATCH /api/event/settings/:pk1 — partial update of sbmm/mode/even_teams
/// (admin). Returns `EventSettingsSerializer`.
pub async fn update_settings(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk1): ApiPath<EventId>,
    Json(req): Json<EventSettingsUpdate>,
) -> Result<Json<EventSettings>, AppError> {
    let pk1 = pk1.inner();
    let club_id = event_club_id(&app, pk1).await?;
    require_admin(&app, user.id, club_id).await?;

    if let Some(sbmm) = req.sbmm {
        let v = i64::from(sbmm);
        sqlx::query!("UPDATE events SET sbmm = ? WHERE id = ?", v, pk1)
            .execute(&app.pool)
            .await?;
    }
    if let Some(mode) = &req.mode {
        if !matches!(mode.as_str(), "sbmm" | "social" | "peg_board") {
            return Err(AppError::Validation(format!(
                "\"{mode}\" is not a valid choice."
            )));
        }
        sqlx::query!("UPDATE events SET mode = ? WHERE id = ?", mode, pk1)
            .execute(&app.pool)
            .await?;
    }
    if let Some(even_teams) = req.even_teams {
        let v = i64::from(even_teams);
        sqlx::query!("UPDATE events SET even_teams = ? WHERE id = ?", v, pk1)
            .execute(&app.pool)
            .await?;
    }

    let r = sqlx::query!(
        r#"SELECT sbmm AS "sbmm!: i64", mode, even_teams AS "even_teams!: i64"
           FROM events WHERE id = ?"#,
        pk1
    )
    .fetch_one(&app.pool)
    .await?;
    Ok(Json(EventSettings {
        sbmm: r.sbmm != 0,
        mode: r.mode,
        even_teams: r.even_teams != 0,
    }))
}

/// GET /api/event/:pk1/stats — aggregated event statistics (`EventStatsSerializer`).
pub async fn event_stats(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk1): ApiPath<EventId>,
) -> Result<Json<EventStats>, AppError> {
    let pk1 = pk1.inner();
    let club_id = event_club_id(&app, pk1).await?;
    require_member(&app, user.id, club_id).await?;

    let r = sqlx::query!(
        "SELECT wins, player_match_counts, best_winstreak, initial_elo, final_elo
         FROM events WHERE id = ?",
        pk1
    )
    .fetch_one(&app.pool)
    .await?;
    let wins = parse_int_map(&r.wins);
    let match_counts = parse_int_map(&r.player_match_counts);
    let best = parse_int_map(&r.best_winstreak);
    let initial = parse_int_map(&r.initial_elo);
    let final_elo = parse_int_map(&r.final_elo);

    Ok(Json(EventStats {
        best_winstreak_players: best_winstreak_players(&app, &best).await?,
        highest_win_rate_players: highest_win_rate_players(&app, &wins, &match_counts).await?,
        most_wins_players: most_wins_players(&app, &wins).await?,
        most_games_played_players: most_games_played_players(&app, &match_counts).await?,
        highest_elo_gain_players: highest_elo_gain_players(&app, &initial, &final_elo).await?,
    }))
}

// --- EventStatsSerializer method ports ------------------------------------

async fn best_winstreak_players(
    app: &AppState,
    best: &BTreeMap<String, i64>,
) -> Result<Vec<Value>, AppError> {
    if best.is_empty() {
        return Ok(vec![]);
    }
    let max = best.values().copied().max().unwrap_or(0);
    let mut out = Vec::new();
    for (id, v) in best {
        if *v == max {
            let name = member_name(app, id.parse().unwrap_or(0)).await?;
            out.push(json!({ "name": name, "best_winstreak": max }));
        }
    }
    Ok(out)
}

async fn most_wins_players(
    app: &AppState,
    wins: &BTreeMap<String, i64>,
) -> Result<Vec<Value>, AppError> {
    if wins.is_empty() {
        return Ok(vec![]);
    }
    let most = wins.values().copied().max().unwrap_or(0);
    let mut out = Vec::new();
    for (id, v) in wins {
        if *v == most {
            let name = member_name(app, id.parse().unwrap_or(0)).await?;
            out.push(json!({ "name": name, "wins": most }));
        }
    }
    Ok(out)
}

async fn most_games_played_players(
    app: &AppState,
    counts: &BTreeMap<String, i64>,
) -> Result<Vec<Value>, AppError> {
    if counts.is_empty() {
        return Ok(vec![]);
    }
    let most = counts.values().copied().max().unwrap_or(0);
    let mut out = Vec::new();
    for (id, v) in counts {
        if *v == most {
            let name = member_name(app, id.parse().unwrap_or(0)).await?;
            out.push(json!({ "name": name, "games_played": most }));
        }
    }
    Ok(out)
}

/// Port of `get_highest_win_rate_players`. Replicates the legacy denominator
/// `match_counts - wins` and the running-max iteration over the `wins` map.
async fn highest_win_rate_players(
    app: &AppState,
    wins: &BTreeMap<String, i64>,
    match_counts: &BTreeMap<String, i64>,
) -> Result<Vec<Value>, AppError> {
    if wins.is_empty() || match_counts.is_empty() {
        return Ok(vec![]);
    }
    let mut highest = 0f64;
    let mut leaders: Vec<(String, f64)> = Vec::new();
    for id in wins.keys() {
        let w = *wins.get(id).unwrap_or(&0) as f64;
        let denom = (*match_counts.get(id).unwrap_or(&1) - *wins.get(id).unwrap_or(&0)) as f64;
        // Legacy divides by (count - wins); a zero denominator would raise in
        // Python — skip it here to avoid NaN/inf parity drift.
        if denom == 0.0 {
            continue;
        }
        let rate = w / denom;
        if rate > highest {
            highest = rate;
            leaders = vec![(id.clone(), rate)];
        } else if rate == highest {
            leaders.push((id.clone(), rate));
        }
    }
    let mut out = Vec::new();
    for (id, rate) in leaders {
        let name = member_name(app, id.parse().unwrap_or(0)).await?;
        out.push(json!({ "name": name, "win_rate": rate }));
    }
    Ok(out)
}

/// Port of `get_highest_elo_gain_players`: running-max over `final - initial`.
async fn highest_elo_gain_players(
    app: &AppState,
    initial: &BTreeMap<String, i64>,
    final_elo: &BTreeMap<String, i64>,
) -> Result<Vec<Value>, AppError> {
    if initial.is_empty() || final_elo.is_empty() {
        return Ok(vec![]);
    }
    let mut highest = 0i64;
    let mut leaders: Vec<String> = Vec::new();
    for id in initial.keys() {
        let (Some(f), Some(i)) = (final_elo.get(id), initial.get(id)) else {
            continue;
        };
        let gain = f - i;
        if gain > highest {
            highest = gain;
            leaders = vec![id.clone()];
        } else if gain == highest {
            leaders.push(id.clone());
        }
    }
    let mut out = Vec::new();
    for id in leaders {
        let name = member_name(app, id.parse().unwrap_or(0)).await?;
        out.push(json!({ "name": name, "elo_gain": highest }));
    }
    Ok(out)
}

/// GET /api/events/active/ — deprecated; mirrors the legacy 501 response.
pub async fn active_events(_user: AuthUser) -> Result<Json<Value>, AppError> {
    Err(AppError::NotImplemented(
        "This endpoint is deprecated and not implemented.".into(),
    ))
}

// ===========================================================================
// Persistence helpers for the JSON stat columns.
// ===========================================================================

/// The JSON `id -> int` stat columns we persist. A fixed enum keeps the dynamic
/// column choice off any user-controlled string.
#[derive(Clone, Copy)]
enum StatColumn {
    InitialElo,
    FinalElo,
    PlayerMatchCounts,
}

/// Serialize and store one of the `id -> int` JSON columns.
async fn persist_int_map(
    app: &AppState,
    event_id: i64,
    column: StatColumn,
    map: &BTreeMap<String, i64>,
) -> Result<(), AppError> {
    let serialized = to_json_object(map)?;
    match column {
        StatColumn::InitialElo => {
            sqlx::query!(
                "UPDATE events SET initial_elo = ? WHERE id = ?",
                serialized,
                event_id
            )
            .execute(&app.pool)
            .await?;
        }
        StatColumn::FinalElo => {
            sqlx::query!(
                "UPDATE events SET final_elo = ? WHERE id = ?",
                serialized,
                event_id
            )
            .execute(&app.pool)
            .await?;
        }
        StatColumn::PlayerMatchCounts => {
            sqlx::query!(
                "UPDATE events SET player_match_counts = ? WHERE id = ?",
                serialized,
                event_id
            )
            .execute(&app.pool)
            .await?;
        }
    }
    Ok(())
}

/// Serialize a map to a JSON object string (stable key order).
fn to_json_object(map: &BTreeMap<String, i64>) -> Result<String, AppError> {
    let mut obj = Map::new();
    for (k, v) in map {
        obj.insert(k.clone(), json!(v));
    }
    serde_json::to_string(&Value::Object(obj))
        .map_err(|e| AppError::Internal(format!("stat serialize: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use time::macros::date;

    fn game(team1: &[i64], team2: &[i64], team1_won: bool) -> GameResult {
        GameResult {
            team1: team1.to_vec(),
            team2: team2.to_vec(),
            team1_won,
        }
    }

    #[test]
    fn team1_win_parses_scores() {
        assert_eq!(team1_win("21,18"), Some(true));
        assert_eq!(team1_win("15,21"), Some(false));
        assert_eq!(team1_win("21,21"), Some(false)); // strictly greater
        assert_eq!(team1_win("bad"), None);
    }

    #[test]
    fn match_counts_increment_for_all_players() {
        let mut counts = BTreeMap::new();
        update_player_match_counts(&mut counts, &game(&[1, 2], &[3, 4], true));
        update_player_match_counts(&mut counts, &game(&[1], &[3], false));
        assert_eq!(counts.get("1"), Some(&2));
        assert_eq!(counts.get("2"), Some(&1));
        assert_eq!(counts.get("3"), Some(&2));
        assert_eq!(counts.get("4"), Some(&1));
    }

    #[test]
    fn win_counts_and_winstreaks_team1() {
        let mut wins = BTreeMap::new();
        let mut streaks = BTreeMap::new();
        let mut best = BTreeMap::new();
        // Team1 wins twice in a row.
        update_player_win_counts(&mut wins, &mut streaks, &mut best, &game(&[1], &[2], true));
        update_player_win_counts(&mut wins, &mut streaks, &mut best, &game(&[1], &[2], true));
        assert_eq!(wins.get("1"), Some(&2));
        assert_eq!(streaks.get("1"), Some(&2));
        assert_eq!(streaks.get("2"), Some(&0));
        assert_eq!(best.get("1"), Some(&2));
        // Team2 now beats team1: team1 streak resets.
        update_player_win_counts(&mut wins, &mut streaks, &mut best, &game(&[1], &[2], false));
        assert_eq!(streaks.get("1"), Some(&0));
        assert_eq!(wins.get("2"), Some(&1));
    }

    #[test]
    fn first_team2_win_leaves_best_winstreak_untouched() {
        // Legacy quirk: a first-ever team-2 win never seeds best_winstreak.
        let mut wins = BTreeMap::new();
        let mut streaks = BTreeMap::new();
        let mut best = BTreeMap::new();
        update_player_win_counts(&mut wins, &mut streaks, &mut best, &game(&[1], &[2], false));
        assert_eq!(wins.get("2"), Some(&1));
        // best_winstreak stays empty because it started empty.
        assert!(best.is_empty());
    }

    #[test]
    fn social_counts_accumulate_co_play() {
        let mut played: BTreeMap<String, BTreeMap<String, i64>> = BTreeMap::new();
        update_player_social_counts(&mut played, &game(&[1, 2], &[3], true));
        update_player_social_counts(&mut played, &game(&[1, 2], &[3], true));
        // Player 1 played with 2 and 3 twice each.
        assert_eq!(played.get("1").and_then(|m| m.get("2")), Some(&2));
        assert_eq!(played.get("1").and_then(|m| m.get("3")), Some(&2));
        // No self-entry.
        assert!(played.get("1").and_then(|m| m.get("1")).is_none());
    }

    #[test]
    fn min_matches_handles_empty() {
        let empty = BTreeMap::new();
        assert_eq!(min_matches(&empty), 0);
        let mut counts = BTreeMap::new();
        counts.insert("1".to_string(), 3);
        counts.insert("2".to_string(), 1);
        assert_eq!(min_matches(&counts), 1);
    }

    #[test]
    fn number_in_team_by_suffix() {
        assert_eq!(number_in_team(Some("badminton singles")), Some(1));
        assert_eq!(number_in_team(Some("tennis doubles")), Some(2));
        assert_eq!(number_in_team(Some("chess")), None);
        assert_eq!(number_in_team(None), None);
    }

    #[test]
    fn auto_manage_predicates() {
        let today = date!(2026 - 06 - 02);
        // Active flag already set -> never re-activate.
        assert!(!should_activate(true, date!(2026 - 06 - 01), today, true));
        // Past date + start passed -> activate.
        assert!(should_activate(false, date!(2026 - 06 - 01), today, true));
        // Past date but start not yet passed -> no.
        assert!(!should_activate(false, date!(2026 - 06 - 01), today, false));
        // Complete predicate: 2+ days old.
        assert!(should_complete(false, date!(2026 - 05 - 30), today));
        assert!(!should_complete(false, date!(2026 - 06 - 01), today));
        assert!(!should_complete(true, date!(2026 - 05 - 01), today));
    }

    #[test]
    fn next_occurrence_daily_and_weekly() {
        let d = date!(2026 - 06 - 02);
        assert_eq!(next_occurrence(d, "daily", 1), Some(date!(2026 - 06 - 03)));
        assert_eq!(next_occurrence(d, "daily", 3), Some(date!(2026 - 06 - 05)));
        assert_eq!(next_occurrence(d, "weekly", 1), Some(date!(2026 - 06 - 09)));
        assert_eq!(next_occurrence(d, "weekly", 2), Some(date!(2026 - 06 - 16)));
        // interval < 1 is treated as 1; unknown frequency yields None.
        assert_eq!(next_occurrence(d, "daily", 0), Some(date!(2026 - 06 - 03)));
        assert_eq!(next_occurrence(d, "yearly", 1), None);
    }

    #[test]
    fn next_occurrence_monthly_clamps_day() {
        // Jan 31 + 1 month -> Feb 28 (2026 is not a leap year).
        assert_eq!(
            next_occurrence(date!(2026 - 01 - 31), "monthly", 1),
            Some(date!(2026 - 02 - 28))
        );
        // Crossing a year boundary.
        assert_eq!(
            next_occurrence(date!(2026 - 12 - 15), "monthly", 1),
            Some(date!(2027 - 01 - 15))
        );
        // Leap-year February keeps the 29th.
        assert_eq!(
            next_occurrence(date!(2024 - 01 - 29), "monthly", 1),
            Some(date!(2024 - 02 - 29))
        );
    }

    #[test]
    fn add_months_multi_step() {
        assert_eq!(
            add_months(date!(2026 - 06 - 02), 3),
            Some(date!(2026 - 09 - 02))
        );
        assert_eq!(
            add_months(date!(2026 - 11 - 30), 3),
            Some(date!(2027 - 02 - 28))
        );
    }
}
