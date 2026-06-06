//! Games: game creation (SBMM / mixed / social / peg), completion (score
//! validation → ELO updates → event-stat updates → player reactivation), and
//! deletion (revert). The pure team-balancing logic lives in
//! `crate::matchmaking`; the ELO math in `crate::rating`; the per-event stat
//! transforms in `crate::domain::events`.
//!
//! Ports: `backend/games/` (models, services, game_creation, views, serializers,
//! urls). JSON shapes mirror the Django serializers exactly:
//! - `GameSerializer`        -> [`GameOut`]   ({ id, team1[], team2[] })
//! - `CompleteGameSerializer`-> [`CompleteGameOut`] (+ game_type, score, start_time)
//! - `MemberSerializer`      -> [`MemberOut`] ({ id, username, first_name, surname, elo })
//! - `SimpleMemberSerializer`-> [`SimpleMemberOut`] (no elo)

use std::collections::BTreeMap;

use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::Json;
use rand::seq::SliceRandom;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

use crate::domain::auth::AuthUser;
use crate::domain::events::{
    update_player_match_counts, update_player_social_counts, update_player_win_counts, GameResult,
};
use crate::error::AppError;
use crate::id::{ApiPath, EventId, GameId, MemberId};
use crate::matchmaking::{self, Gender, Player};
use crate::rating;
use crate::skill::{self, RatingModel, SkillState, TeamSkills};
use crate::state::AppState;

// ===========================================================================
// Response shapes (mirror the Django serializers exactly).
// ===========================================================================

/// `MemberSerializer`: a member with their ELO for the game's game type.
#[derive(Debug, Serialize)]
pub struct MemberOut {
    id: MemberId,
    username: String,
    first_name: Option<String>,
    surname: Option<String>,
    /// `get_elo`: the member's ELO for the game type, or `null` if none.
    elo: Option<i64>,
}

/// `SimpleMemberSerializer`: a member with no ELO field.
#[derive(Debug, Serialize)]
pub struct SimpleMemberOut {
    id: MemberId,
    username: String,
    first_name: Option<String>,
    surname: Option<String>,
}

/// `GameSerializer`: `{ id, team1[], team2[] }`.
#[derive(Debug, Serialize)]
pub struct GameOut {
    id: GameId,
    team1: Vec<MemberOut>,
    team2: Vec<MemberOut>,
}

/// `CompleteGameSerializer`: GameSerializer + game_type id, score, start_time.
/// `game_type_name` is an additive convenience so clients can display/group/
/// filter by the game type without a second lookup; the legacy `game_type` id
/// is kept for parity.
#[derive(Debug, Serialize)]
pub struct CompleteGameOut {
    id: GameId,
    team1: Vec<MemberOut>,
    team2: Vec<MemberOut>,
    game_type: Option<i64>,
    game_type_name: Option<String>,
    score: Option<String>,
    start_time: String,
}

// ===========================================================================
// Permission + lookup helpers (shared semantics with clubs.rs / events.rs).
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

/// Flat event row needed to drive matchmaking + completion.
struct EventCore {
    club_id: i64,
    game_type_id: Option<i64>,
    game_type_name: Option<String>,
    sbmm: bool,
    even_teams: bool,
}

/// Fetch an event's core fields or 404 (`get_object_or_404(Event, ...)`).
async fn event_core(app: &AppState, event_id: i64) -> Result<EventCore, AppError> {
    let r = sqlx::query!(
        r#"SELECT e.club_id AS "club_id!: i64", e.game_type_id AS "game_type_id?: i64",
                  e.sbmm AS "sbmm!: i64", e.even_teams AS "even_teams!: i64",
                  gt.name AS "game_type_name?: String"
           FROM events e
           LEFT JOIN game_types gt ON gt.id = e.game_type_id
           WHERE e.id = ?"#,
        event_id
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No Event matches the given query.".into()))?;
    Ok(EventCore {
        club_id: r.club_id,
        game_type_id: r.game_type_id,
        game_type_name: r.game_type_name,
        sbmm: r.sbmm != 0,
        even_teams: r.even_teams != 0,
    })
}

/// Mirror of `games.views.number_in_team`: 1 for "...singles", 2 for "...doubles".
/// The legacy returns `None` otherwise (and treats it like 0 players-per-team).
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

/// A candidate active member, with the data the matchmakers need.
#[derive(Clone)]
struct ActiveMember {
    member_id: i64,
    elo: i64,
    winstreak: i64,
    gender: Gender,
}

/// Load the active members of an event plus their ELO/winstreak for the game type
/// (defaulting to 1000/0 when no rating row exists, matching the seeded default).
async fn load_active_members(
    app: &AppState,
    event_id: i64,
    game_type_id: Option<i64>,
) -> Result<Vec<ActiveMember>, AppError> {
    let rows = sqlx::query!(
        r#"SELECT m.id AS "member_id!: i64", m.user_id AS "user_id!: i64",
                  u.biological_gender AS "gender!: String"
           FROM event_active_members em
           JOIN members m ON m.id = em.member_id
           JOIN users u ON u.id = m.user_id
           WHERE em.event_id = ? ORDER BY m.id"#,
        event_id
    )
    .fetch_all(&app.pool)
    .await?;

    let mut out = Vec::with_capacity(rows.len());
    for r in rows {
        let (elo, winstreak) = match game_type_id {
            Some(gt) => sqlx::query!(
                r#"SELECT e.elo AS "elo!: i64", e.winstreak AS "winstreak!: i64"
                   FROM user_elos ue JOIN elo e ON e.id = ue.elo_id
                   WHERE ue.user_id = ? AND e.game_type_id = ? LIMIT 1"#,
                r.user_id,
                gt
            )
            .fetch_optional(&app.pool)
            .await?
            .map(|e| (e.elo, e.winstreak))
            .unwrap_or((1000, 0)),
            None => (1000, 0),
        };
        out.push(ActiveMember {
            member_id: r.member_id,
            elo,
            winstreak,
            gender: if r.gender == "female" {
                Gender::Female
            } else {
                Gender::Male
            },
        });
    }
    Ok(out)
}

/// `event.get_player_match_count(member)`: the stored match count or 0.
fn match_count(counts: &BTreeMap<String, i64>, member_id: i64) -> i64 {
    counts.get(&member_id.to_string()).copied().unwrap_or(0)
}

/// Parse a stored JSON object of `id -> int` (one of the event stat columns).
fn parse_int_map(raw: &str) -> BTreeMap<String, i64> {
    serde_json::from_str(raw).unwrap_or_default()
}

/// Parse a stored nested JSON object (`played_with`).
fn parse_nested_map(raw: &str) -> BTreeMap<String, BTreeMap<String, i64>> {
    serde_json::from_str(raw).unwrap_or_default()
}

fn now() -> OffsetDateTime {
    OffsetDateTime::now_utc()
}

fn fmt_ts(t: OffsetDateTime) -> Result<String, AppError> {
    t.format(&Rfc3339)
        .map_err(|e| AppError::Internal(format!("time format: {e}")))
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

/// Serialize a nested map to a JSON object string.
fn to_nested_json_object(
    map: &BTreeMap<String, BTreeMap<String, i64>>,
) -> Result<String, AppError> {
    serde_json::to_string(map).map_err(|e| AppError::Internal(format!("stat serialize: {e}")))
}

// ===========================================================================
// Game creation (port of create_game_for_event + the create views).
// ===========================================================================

/// Persist a game for an event from chosen team member ids, moving the members
/// from the event's active set to its in-game set (port of
/// `create_game_for_event` + the inline view loops). Returns the new game id.
async fn create_game_for_event(
    app: &AppState,
    event_id: i64,
    game_type_id: Option<i64>,
    team1: &[i64],
    team2: &[i64],
) -> Result<i64, AppError> {
    let start_time = fmt_ts(now())?;
    let game_id = sqlx::query_scalar!(
        r#"INSERT INTO games (game_type_id, start_time) VALUES (?, ?)
           RETURNING id AS "id!: i64""#,
        game_type_id,
        start_time
    )
    .fetch_one(&app.pool)
    .await?;

    for &member_id in team1 {
        add_team_member(app, game_id, member_id, 1).await?;
        move_active_to_in_game(app, event_id, member_id).await?;
    }
    for &member_id in team2 {
        add_team_member(app, game_id, member_id, 2).await?;
        move_active_to_in_game(app, event_id, member_id).await?;
    }

    sqlx::query!(
        "INSERT OR IGNORE INTO event_games (event_id, game_id) VALUES (?, ?)",
        event_id,
        game_id
    )
    .execute(&app.pool)
    .await?;
    Ok(game_id)
}

/// Add a member to a game team (and the `all_users` set, mirroring the Django
/// `m2m_changed` signal that keeps `all_users` in sync).
async fn add_team_member(
    app: &AppState,
    game_id: i64,
    member_id: i64,
    team: i64,
) -> Result<(), AppError> {
    if team == 1 {
        sqlx::query!(
            "INSERT OR IGNORE INTO game_team1 (game_id, member_id) VALUES (?, ?)",
            game_id,
            member_id
        )
        .execute(&app.pool)
        .await?;
    } else {
        sqlx::query!(
            "INSERT OR IGNORE INTO game_team2 (game_id, member_id) VALUES (?, ?)",
            game_id,
            member_id
        )
        .execute(&app.pool)
        .await?;
    }
    sqlx::query!(
        "INSERT OR IGNORE INTO game_all_users (game_id, member_id) VALUES (?, ?)",
        game_id,
        member_id
    )
    .execute(&app.pool)
    .await?;
    Ok(())
}

async fn move_active_to_in_game(
    app: &AppState,
    event_id: i64,
    member_id: i64,
) -> Result<(), AppError> {
    sqlx::query!(
        "DELETE FROM event_active_members WHERE event_id = ? AND member_id = ?",
        event_id,
        member_id
    )
    .execute(&app.pool)
    .await?;
    sqlx::query!(
        "INSERT OR IGNORE INTO event_in_game_members (event_id, member_id) VALUES (?, ?)",
        event_id,
        member_id
    )
    .execute(&app.pool)
    .await?;
    Ok(())
}

/// Pick `player_1`: a uniformly random choice among the least-played active
/// members (`min(get_player_match_count)`). Mirrors the views' selection.
fn pick_player_1<'a>(
    active: &'a [ActiveMember],
    counts: &BTreeMap<String, i64>,
) -> Option<&'a ActiveMember> {
    let least = active
        .iter()
        .map(|m| match_count(counts, m.member_id))
        .min()?;
    let least_played: Vec<&ActiveMember> = active
        .iter()
        .filter(|m| match_count(counts, m.member_id) == least)
        .collect();
    let mut rng = rand::thread_rng();
    least_played.choose(&mut rng).copied()
}

/// Map an [`ActiveMember`] to the pure-logic [`Player`].
fn to_player(m: &ActiveMember) -> Player {
    Player {
        id: m.member_id,
        elo: m.elo,
        winstreak: m.winstreak,
        gender: m.gender,
    }
}

#[derive(Deserialize)]
pub struct CreateGameRequest {
    event_id: Option<EventId>,
}

/// POST /api/game/create-sbmm — SBMM (or mixed SBMM, by chance + feasibility).
/// Mirrors `SBMMCreateGameView`.
pub async fn create_sbmm(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreateGameRequest>,
) -> Result<(StatusCode, Json<GameOut>), AppError> {
    let event_id = req
        .event_id
        .ok_or_else(|| AppError::NotFound("No Event matches the given query.".into()))?
        .inner();
    let event = event_core(&app, event_id).await?;
    require_admin(&app, user.id, event.club_id).await?;

    let team_size = number_in_team(event.game_type_name.as_deref()).unwrap_or(0);
    let active = load_active_members(&app, event_id, event.game_type_id).await?;
    if (active.len() as i64) < 2 * team_size {
        return Err(AppError::Validation(
            "Not enough players available for a game".into(),
        ));
    }

    let counts = load_match_counts(&app, event_id).await?;
    let player_1 = pick_player_1(&active, &counts)
        .ok_or_else(|| AppError::Validation("Not enough players available for a game".into()))?
        .clone();

    // Mixed is only possible for doubles with >=2 of each gender.
    let mixed_possible = team_size == 2 && {
        let males = active.iter().filter(|m| m.gender == Gender::Male).count();
        let females = active.iter().filter(|m| m.gender == Gender::Female).count();
        males >= 2 && females >= 2
    };

    let players: Vec<Player> = active.iter().map(to_player).collect();
    let p1 = to_player(&player_1);
    // Scope the (non-`Send`) RNG so it is dropped before any `.await`.
    let (team1, team2) = {
        let mut rng = rand::thread_rng();
        let choice: bool = rng.gen_bool(0.5);
        if choice && mixed_possible {
            matchmaking::mixed_sbmm(&p1, &players, &mut rng)?
        } else {
            matchmaking::sbmm(&p1, &players, team_size as usize, &mut rng)?
        }
    };

    let game_id = create_game_for_event(&app, event_id, event.game_type_id, &team1, &team2).await?;
    let out = game_out(&app, game_id, event.game_type_name.as_deref()).await?;
    Ok((StatusCode::CREATED, Json(out)))
}

/// POST /api/game/create-social — social matchmaking. Mirrors `SocialCreateGameView`.
pub async fn create_social(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreateGameRequest>,
) -> Result<(StatusCode, Json<GameOut>), AppError> {
    let event_id = req
        .event_id
        .ok_or_else(|| AppError::NotFound("No Event matches the given query.".into()))?
        .inner();
    let event = event_core(&app, event_id).await?;
    require_admin(&app, user.id, event.club_id).await?;

    let team_size = number_in_team(event.game_type_name.as_deref()).unwrap_or(0);
    let active = load_active_members(&app, event_id, event.game_type_id).await?;
    if (active.len() as i64) < 2 * team_size {
        return Err(AppError::Validation(
            "Not enough players available for a game".into(),
        ));
    }

    let counts = load_match_counts(&app, event_id).await?;
    let player_1 = pick_player_1(&active, &counts)
        .ok_or_else(|| AppError::Validation("Not enough players available for a game".into()))?
        .clone();

    // played_with: nested member-id map keyed by string, lifted to i64 keys.
    let played_with = load_played_with(&app, event_id).await?;

    // Potential players exclude player_1 (the view passes the remainder).
    let potential: Vec<Player> = active
        .iter()
        .filter(|m| m.member_id != player_1.member_id)
        .map(to_player)
        .collect();
    let p1 = to_player(&player_1);
    // Scope the (non-`Send`) RNG so it is dropped before any `.await`.
    let (team1, team2) = {
        let mut rng = rand::thread_rng();
        matchmaking::social(
            &p1,
            &potential,
            &played_with,
            team_size as usize,
            event.even_teams,
            &mut rng,
        )?
    };

    let game_id = create_game_for_event(&app, event_id, event.game_type_id, &team1, &team2).await?;
    let out = game_out(&app, game_id, event.game_type_name.as_deref()).await?;
    Ok((StatusCode::CREATED, Json(out)))
}

/// POST /api/game/get-player_1 — the least-played active member (peg setup).
/// Mirrors `PegPlayer1View` (returns `SimpleMemberSerializer`).
pub async fn get_player_1(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreateGameRequest>,
) -> Result<Json<SimpleMemberOut>, AppError> {
    let event_id = req
        .event_id
        .ok_or_else(|| AppError::NotFound("No Event matches the given query.".into()))?
        .inner();
    let event = event_core(&app, event_id).await?;
    require_admin(&app, user.id, event.club_id).await?;

    let team_size = number_in_team(event.game_type_name.as_deref()).unwrap_or(0);
    let active = load_active_members(&app, event_id, event.game_type_id).await?;
    if (active.len() as i64) < 2 * team_size {
        return Err(AppError::Validation(
            "Not enough players available for a game".into(),
        ));
    }

    let counts = load_match_counts(&app, event_id).await?;
    let player_1 = pick_player_1(&active, &counts)
        .ok_or_else(|| AppError::NotFound("No members found for this event.".into()))?;

    let r = sqlx::query!(
        r#"SELECT m.id AS "id!: i64", u.username AS "username!: String",
                  u.first_name, u.surname
           FROM members m JOIN users u ON u.id = m.user_id WHERE m.id = ?"#,
        player_1.member_id
    )
    .fetch_one(&app.pool)
    .await?;
    Ok(Json(SimpleMemberOut {
        id: r.id.into(),
        username: r.username,
        first_name: r.first_name,
        surname: r.surname,
    }))
}

#[derive(Deserialize)]
pub struct PegCreateRequest {
    event_id: Option<EventId>,
    #[serde(default)]
    member_ids: Vec<MemberId>,
}

/// POST /api/game/create-peg — manually pegged teams. Mirrors `PegCreateGameView`:
/// splits `member_ids` at `team_size`.
pub async fn create_peg(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<PegCreateRequest>,
) -> Result<(StatusCode, Json<GameOut>), AppError> {
    let event_id = req
        .event_id
        .ok_or_else(|| AppError::NotFound("No Event matches the given query.".into()))?
        .inner();
    let event = event_core(&app, event_id).await?;
    require_admin(&app, user.id, event.club_id).await?;

    let member_ids: Vec<i64> = req.member_ids.iter().map(|m| m.inner()).collect();
    let team_size = number_in_team(event.game_type_name.as_deref()).unwrap_or(0) as usize;
    let (team1, team2): (&[i64], &[i64]) = if team_size <= member_ids.len() {
        member_ids.split_at(team_size)
    } else {
        (member_ids.as_slice(), &[])
    };

    let game_id = create_game_for_event(&app, event_id, event.game_type_id, team1, team2).await?;
    let out = game_out(&app, game_id, event.game_type_name.as_deref()).await?;
    Ok((StatusCode::CREATED, Json(out)))
}

// ===========================================================================
// Delete (revert) — port of services.delete_game + DeleteGameView.
// ===========================================================================

#[derive(Deserialize)]
pub struct DeleteGameRequest {
    game_id: Option<GameId>,
    event_id: Option<EventId>,
}

/// POST /api/game/delete — delete a game, moving its members back to active.
pub async fn delete_game(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<DeleteGameRequest>,
) -> Result<StatusCode, AppError> {
    let (Some(game_id), Some(event_id)) = (req.game_id, req.event_id) else {
        return Err(AppError::Validation(
            "Game ID and Event ID are required".into(),
        ));
    };
    let (game_id, event_id) = (game_id.inner(), event_id.inner());
    let event = event_core(&app, event_id).await?;
    require_admin(&app, user.id, event.club_id).await?;
    game_exists(&app, game_id).await?;

    // `if game not in event.games` -> ValueError -> 400.
    let belongs = sqlx::query_scalar!(
        r#"SELECT 1 AS "x!: i64" FROM event_games WHERE event_id = ? AND game_id = ? LIMIT 1"#,
        event_id,
        game_id
    )
    .fetch_optional(&app.pool)
    .await?
    .is_some();
    if !belongs {
        return Err(AppError::Validation(
            "Game does not belong to this event.".into(),
        ));
    }

    let players = team_member_ids(&app, game_id).await?;
    for member_id in players {
        sqlx::query!(
            "INSERT OR IGNORE INTO event_active_members (event_id, member_id) VALUES (?, ?)",
            event_id,
            member_id
        )
        .execute(&app.pool)
        .await?;
        sqlx::query!(
            "DELETE FROM event_in_game_members WHERE event_id = ? AND member_id = ?",
            event_id,
            member_id
        )
        .execute(&app.pool)
        .await?;
    }
    sqlx::query!(
        "DELETE FROM event_games WHERE event_id = ? AND game_id = ?",
        event_id,
        game_id
    )
    .execute(&app.pool)
    .await?;
    sqlx::query!("DELETE FROM games WHERE id = ?", game_id)
        .execute(&app.pool)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

// ===========================================================================
// Complete — port of services.complete_game + elo.update_elo + CompleteGameView.
// ===========================================================================

#[derive(Deserialize)]
pub struct CompleteGameRequest {
    game_id: Option<GameId>,
    event_id: Option<EventId>,
    score: Option<String>,
}

/// POST /api/game/complete — validate the score, update ELO, reactivate players,
/// and update the event's stat maps. Mirrors `CompleteGameView` + `complete_game`.
pub async fn complete_game(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<CompleteGameRequest>,
) -> Result<Json<Value>, AppError> {
    let (Some(game_id), Some(score)) = (req.game_id, req.score.clone()) else {
        return Err(AppError::Validation(
            "Game ID and score are required".into(),
        ));
    };
    let game_id = game_id.inner();
    let event_id = req
        .event_id
        .ok_or_else(|| AppError::NotFound("No Event matches the given query.".into()))?
        .inner();
    let event = event_core(&app, event_id).await?;
    require_admin(&app, user.id, event.club_id).await?;
    game_exists(&app, game_id).await?;

    // Score validation (port of complete_game): "s1,s2" with a winner >= 21.
    let (s1, s2) = parse_score(&score)?;
    if !(s1 >= 21 || s2 >= 21) {
        return Err(AppError::Validation(
            "Invalid score. Winning team must have 21 or more points.".into(),
        ));
    }

    sqlx::query!("UPDATE games SET score = ? WHERE id = ?", score, game_id)
        .execute(&app.pool)
        .await?;

    let team1 = team_ids(&app, game_id, 1).await?;
    let team2 = team_ids(&app, game_id, 2).await?;
    let team1_won = rating::team1_win(&score)?;
    let diff = rating::score_difference(&score)?;

    update_elo(
        &app,
        game_id,
        event.game_type_id,
        &team1,
        &team2,
        team1_won,
        diff,
        event.sbmm,
    )
    .await?;

    // Reactivate every player (move in_game -> active) + track played-one-match.
    let all: Vec<i64> = team1.iter().chain(&team2).copied().collect();
    for &member_id in &all {
        sqlx::query!(
            "INSERT OR IGNORE INTO event_active_members (event_id, member_id) VALUES (?, ?)",
            event_id,
            member_id
        )
        .execute(&app.pool)
        .await?;
        sqlx::query!(
            "DELETE FROM event_in_game_members WHERE event_id = ? AND member_id = ?",
            event_id,
            member_id
        )
        .execute(&app.pool)
        .await?;
        sqlx::query!(
            "INSERT OR IGNORE INTO event_played_one_match (event_id, member_id) VALUES (?, ?)",
            event_id,
            member_id
        )
        .execute(&app.pool)
        .await?;
    }

    // Update event stat maps via the shared events stat helpers.
    let result = GameResult {
        team1: team1.clone(),
        team2: team2.clone(),
        team1_won,
    };
    update_event_stats(&app, event_id, &result).await?;

    Ok(Json(json!({ "message": "Game completed successfully" })))
}

/// Parse a `"s1,s2"` score into the two integer scores (port of the `map(int, ...)`
/// + `ValueError` in `complete_game`).
fn parse_score(score: &str) -> Result<(i64, i64), AppError> {
    let invalid = || AppError::Validation("Invalid score format. Expected 'score1,score2'.".into());
    let mut parts = score.split(',');
    let (Some(a), Some(b), None) = (parts.next(), parts.next(), parts.next()) else {
        return Err(invalid());
    };
    let a = a.trim().parse::<i64>().map_err(|_| invalid())?;
    let b = b.trim().parse::<i64>().map_err(|_| invalid())?;
    Ok((a, b))
}

/// Post-game rating update. Loads each player's per-`(user, game_type)` skill
/// state (creating one at the model default if absent), runs the game type's
/// pluggable [`skill::RatingModel`], and persists the new state plus the legacy
/// `elo` display column, winstreaks, and the win/lose join rows.
///
/// `sbmm` gates the *rating* update (parity: non-SBMM games freeze ratings and
/// only move winstreaks). The model is selected per game type via
/// `game_types.model_version`, so old game types keep the Elo math and new ones
/// can adopt Weng-Lin/Glicko-2 without disturbing existing ratings.
#[allow(clippy::too_many_arguments)]
async fn update_elo(
    app: &AppState,
    game_id: i64,
    game_type_id: Option<i64>,
    team1: &[i64],
    team2: &[i64],
    team1_won: bool,
    diff: i64,
    sbmm: bool,
) -> Result<(), AppError> {
    let (winners, losers) = if team1_won {
        (team1, team2)
    } else {
        (team2, team1)
    };

    let version = model_version_for(app, game_type_id).await?;
    let model = skill::model_for(&version);

    // Skill rows per member (in order) for each side.
    let mut win_rows = Vec::new();
    for &member_id in winners {
        win_rows.push(elo_row_for_member(app, member_id, game_type_id, model.as_ref()).await?);
    }
    let mut lose_rows = Vec::new();
    for &member_id in losers {
        lose_rows.push(elo_row_for_member(app, member_id, game_type_id, model.as_ref()).await?);
    }

    // Lazy decay: inflate uncertainty for players who have been inactive, based
    // on time since their last game (no scheduler — applied here at read time).
    let now_ts = now();
    let decayed = |r: &EloRow| -> SkillState {
        let mut s = row_to_state(r);
        model.decay(&mut s, days_inactive(&r.last_game, now_ts));
        s
    };
    let win_team = TeamSkills(win_rows.iter().map(&decayed).collect());
    let lose_team = TeamSkills(lose_rows.iter().map(&decayed).collect());

    // Rating update only runs for SBMM games with both teams present.
    let updated = if sbmm && !win_rows.is_empty() && !lose_rows.is_empty() {
        // Calibration telemetry: log predicted win prob vs the actual outcome so
        // models can be compared on Brier score / reliability.
        let predicted = model.expected_score(&win_team, &lose_team);
        tracing::info!(
            model = %version,
            predicted,
            actual = 1.0_f64,
            margin = diff,
            "rating_calibration"
        );
        let [w, l] = model.update(&win_team, &lose_team, diff as f64);
        Some((w, l))
    } else {
        None
    };

    let last_game = fmt_ts(now())?;

    for (i, row) in win_rows.iter().enumerate() {
        let winstreak = row.winstreak + 1;
        let best = winstreak.max(row.best_winstreak);
        match updated.as_ref().map(|(w, _)| &w[i]) {
            Some(s) => {
                let elo_disp = model.conservative_rating(s).round() as i64;
                let extra = s.extra.to_string();
                let gp = s.games_played as i64;
                sqlx::query!(
                    "UPDATE elo SET elo = ?, mu = ?, sigma = ?, games_played = ?,
                                    model_version = ?, extra = ?, winstreak = ?,
                                    best_winstreak = ?, last_game = ? WHERE id = ?",
                    elo_disp,
                    s.mu,
                    s.sigma,
                    gp,
                    version,
                    extra,
                    winstreak,
                    best,
                    last_game,
                    row.elo_id
                )
                .execute(&app.pool)
                .await?;
            }
            None => {
                sqlx::query!(
                    "UPDATE elo SET winstreak = ?, best_winstreak = ?, last_game = ? WHERE id = ?",
                    winstreak,
                    best,
                    last_game,
                    row.elo_id
                )
                .execute(&app.pool)
                .await?;
            }
        }
        sqlx::query!(
            "INSERT OR IGNORE INTO elo_game_wins (elo_id, game_id) VALUES (?, ?)",
            row.elo_id,
            game_id
        )
        .execute(&app.pool)
        .await?;
    }

    for (i, row) in lose_rows.iter().enumerate() {
        match updated.as_ref().map(|(_, l)| &l[i]) {
            Some(s) => {
                let elo_disp = model.conservative_rating(s).round() as i64;
                let extra = s.extra.to_string();
                let gp = s.games_played as i64;
                sqlx::query!(
                    "UPDATE elo SET elo = ?, mu = ?, sigma = ?, games_played = ?,
                                    model_version = ?, extra = ?, winstreak = 0,
                                    last_game = ? WHERE id = ?",
                    elo_disp,
                    s.mu,
                    s.sigma,
                    gp,
                    version,
                    extra,
                    last_game,
                    row.elo_id
                )
                .execute(&app.pool)
                .await?;
            }
            None => {
                sqlx::query!(
                    "UPDATE elo SET winstreak = 0, last_game = ? WHERE id = ?",
                    last_game,
                    row.elo_id
                )
                .execute(&app.pool)
                .await?;
            }
        }
        sqlx::query!(
            "INSERT OR IGNORE INTO elo_game_loses (elo_id, game_id) VALUES (?, ?)",
            row.elo_id,
            game_id
        )
        .execute(&app.pool)
        .await?;
    }
    Ok(())
}

/// The rating model selected for a game type (`game_types.model_version`),
/// defaulting to the legacy Elo model when there is no game type.
async fn model_version_for(app: &AppState, game_type_id: Option<i64>) -> Result<String, AppError> {
    let Some(id) = game_type_id else {
        return Ok(skill::elo::VERSION.to_string());
    };
    Ok(sqlx::query_scalar!(
        r#"SELECT model_version AS "v!: String" FROM game_types WHERE id = ?"#,
        id
    )
    .fetch_optional(&app.pool)
    .await?
    .unwrap_or_else(|| skill::elo::VERSION.to_string()))
}

struct EloRow {
    elo_id: i64,
    winstreak: i64,
    best_winstreak: i64,
    mu: f64,
    sigma: f64,
    games_played: i64,
    extra: String,
    last_game: String,
}

/// Build a model-agnostic [`SkillState`] from a persisted row.
fn row_to_state(r: &EloRow) -> SkillState {
    SkillState {
        mu: r.mu,
        sigma: r.sigma,
        games_played: r.games_played.max(0) as u32,
        extra: serde_json::from_str(&r.extra).unwrap_or(Value::Null),
    }
}

/// Whole-day count since an RFC3339 `last_game` (0 if absent/unparseable), used
/// to drive each model's lazy uncertainty decay.
fn days_inactive(last_game: &str, now: OffsetDateTime) -> f64 {
    OffsetDateTime::parse(last_game, &Rfc3339)
        .map(|t| ((now - t).whole_seconds().max(0) as f64) / 86_400.0)
        .unwrap_or(0.0)
}

/// Fetch (or create at the model default) a member's skill row for the game type.
async fn elo_row_for_member(
    app: &AppState,
    member_id: i64,
    game_type_id: Option<i64>,
    model: &dyn RatingModel,
) -> Result<EloRow, AppError> {
    let member = sqlx::query!(
        r#"SELECT user_id AS "user_id!: i64" FROM members WHERE id = ?"#,
        member_id
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No Member matches the given query.".into()))?;

    // COALESCE keeps the read robust for rows created before the skill-model
    // migration (or by the bare `INSERT INTO elo` paths): a NULL `mu` falls back
    // to the legacy `elo`, and a NULL `sigma` to the high-uncertainty default.
    if let Some(existing) = sqlx::query!(
        r#"SELECT e.id AS "id!: i64",
                  e.winstreak AS "winstreak!: i64", e.best_winstreak AS "best_winstreak!: i64",
                  COALESCE(e.mu, CAST(e.elo AS REAL)) AS "mu!: f64",
                  COALESCE(e.sigma, 350.0 / 3.0) AS "sigma!: f64",
                  e.games_played AS "games_played!: i64", e.extra AS "extra!: String",
                  e.last_game AS "last_game!: String"
           FROM user_elos ue JOIN elo e ON e.id = ue.elo_id
           WHERE ue.user_id = ? AND e.game_type_id IS ? LIMIT 1"#,
        member.user_id,
        game_type_id
    )
    .fetch_optional(&app.pool)
    .await?
    {
        return Ok(EloRow {
            elo_id: existing.id,
            winstreak: existing.winstreak,
            best_winstreak: existing.best_winstreak,
            mu: existing.mu,
            sigma: existing.sigma,
            games_played: existing.games_played,
            extra: existing.extra,
            last_game: existing.last_game,
        });
    }

    let default = model.default_state();
    let elo_disp = model.conservative_rating(&default).round() as i64;
    let extra = default.extra.to_string();
    let version = model.version();
    let games_played = default.games_played as i64;
    let last_game = fmt_ts(now())?;
    let new_id = sqlx::query_scalar!(
        r#"INSERT INTO elo (game_type_id, last_game, elo, mu, sigma, games_played, model_version, extra)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           RETURNING id AS "id!: i64""#,
        game_type_id,
        last_game,
        elo_disp,
        default.mu,
        default.sigma,
        games_played,
        version,
        extra
    )
    .fetch_one(&app.pool)
    .await?;
    sqlx::query!(
        "INSERT INTO user_elos (user_id, elo_id) VALUES (?, ?)",
        member.user_id,
        new_id
    )
    .execute(&app.pool)
    .await?;
    Ok(EloRow {
        elo_id: new_id,
        winstreak: 0,
        best_winstreak: 0,
        mu: default.mu,
        sigma: default.sigma,
        games_played,
        extra,
        last_game,
    })
}

/// Apply the three event stat transforms on completion and persist the columns
/// (`player_match_counts`, `wins`, `winstreaks`, `best_winstreak`, `played_with`).
async fn update_event_stats(
    app: &AppState,
    event_id: i64,
    game: &GameResult,
) -> Result<(), AppError> {
    let r = sqlx::query!(
        "SELECT player_match_counts, wins, winstreaks, best_winstreak, played_with
         FROM events WHERE id = ?",
        event_id
    )
    .fetch_one(&app.pool)
    .await?;

    let mut counts = parse_int_map(&r.player_match_counts);
    let mut wins = parse_int_map(&r.wins);
    let mut winstreaks = parse_int_map(&r.winstreaks);
    let mut best = parse_int_map(&r.best_winstreak);
    let mut played_with = parse_nested_map(&r.played_with);

    update_player_match_counts(&mut counts, game);
    update_player_win_counts(&mut wins, &mut winstreaks, &mut best, game);
    update_player_social_counts(&mut played_with, game);

    let counts_s = to_json_object(&counts)?;
    let wins_s = to_json_object(&wins)?;
    let streaks_s = to_json_object(&winstreaks)?;
    let best_s = to_json_object(&best)?;
    let played_s = to_nested_json_object(&played_with)?;
    sqlx::query!(
        "UPDATE events SET player_match_counts = ?, wins = ?, winstreaks = ?,
                           best_winstreak = ?, played_with = ? WHERE id = ?",
        counts_s,
        wins_s,
        streaks_s,
        best_s,
        played_s,
        event_id
    )
    .execute(&app.pool)
    .await?;
    Ok(())
}

// ===========================================================================
// Listing — port of GameListView, EventGamesListView, UserGamesListView.
// ===========================================================================

/// GET /api/game/games/:pk1 — incomplete games for an event (`GameSerializer`).
pub async fn event_incomplete_games(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk1): ApiPath<EventId>,
) -> Result<Json<Vec<GameOut>>, AppError> {
    let pk1 = pk1.inner();
    let event = event_core(&app, pk1).await?;
    require_member(&app, user.id, event.club_id).await?;

    let ids = sqlx::query!(
        r#"SELECT g.id AS "id!: i64" FROM event_games eg
           JOIN games g ON g.id = eg.game_id
           WHERE eg.event_id = ? AND g.score IS NULL ORDER BY g.id"#,
        pk1
    )
    .fetch_all(&app.pool)
    .await?;

    let mut out = Vec::with_capacity(ids.len());
    for r in ids {
        out.push(game_out(&app, r.id, event.game_type_name.as_deref()).await?);
    }
    Ok(Json(out))
}

/// GET /api/game/event/games/:pk1 — completed games for an event
/// (`CompleteGameSerializer`, newest first).
pub async fn event_complete_games(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk1): ApiPath<EventId>,
) -> Result<Json<Vec<CompleteGameOut>>, AppError> {
    let pk1 = pk1.inner();
    let event = event_core(&app, pk1).await?;
    require_member(&app, user.id, event.club_id).await?;

    let ids = sqlx::query!(
        r#"SELECT g.id AS "id!: i64" FROM event_games eg
           JOIN games g ON g.id = eg.game_id
           WHERE eg.event_id = ? AND g.score IS NOT NULL
           ORDER BY g.start_time DESC, g.id DESC"#,
        pk1
    )
    .fetch_all(&app.pool)
    .await?;

    let mut out = Vec::with_capacity(ids.len());
    for r in ids {
        out.push(complete_game_out(&app, r.id, event.game_type_name.as_deref()).await?);
    }
    Ok(Json(out))
}

#[derive(Deserialize)]
pub struct UserGamesQuery {
    num_of_games: Option<i64>,
    game_type: Option<String>,
}

/// GET /api/game/users/games — the user's recent completed games, paginated by
/// `num_of_games` (default 10). Mirrors `UserGamesListView` + `get_user_last_games`.
pub async fn user_games(
    State(app): State<AppState>,
    user: AuthUser,
    Query(q): Query<UserGamesQuery>,
) -> Result<Json<Vec<CompleteGameOut>>, AppError> {
    let limit = q.num_of_games.unwrap_or(10);

    // `get_user_last_games`: games where the user is in all_users + score set.
    let ids = sqlx::query!(
        r#"SELECT DISTINCT g.id AS "id!: i64", g.start_time, g.game_type_id AS "game_type_id?: i64"
           FROM games g
           JOIN game_all_users gau ON gau.game_id = g.id
           JOIN members m ON m.id = gau.member_id
           LEFT JOIN game_types gt ON gt.id = g.game_type_id
           WHERE m.user_id = ? AND g.score IS NOT NULL
             AND (? IS NULL OR gt.name = ?)
           ORDER BY g.start_time DESC, g.id DESC
           LIMIT ?"#,
        user.id,
        q.game_type,
        q.game_type,
        limit
    )
    .fetch_all(&app.pool)
    .await?;

    let mut out = Vec::with_capacity(ids.len());
    for r in ids {
        let gt_name = match r.game_type_id {
            Some(gt) => {
                sqlx::query_scalar!("SELECT name FROM game_types WHERE id = ?", gt)
                    .fetch_optional(&app.pool)
                    .await?
            }
            None => None,
        };
        out.push(complete_game_out(&app, r.id, gt_name.as_deref()).await?);
    }
    Ok(Json(out))
}

// ===========================================================================
// Row -> serializer helpers + small DB helpers.
// ===========================================================================

/// 404 if the game doesn't exist (`get_object_or_404(Game, ...)`).
async fn game_exists(app: &AppState, game_id: i64) -> Result<(), AppError> {
    let exists = sqlx::query_scalar!(r#"SELECT 1 AS "x!: i64" FROM games WHERE id = ?"#, game_id)
        .fetch_optional(&app.pool)
        .await?
        .is_some();
    if exists {
        Ok(())
    } else {
        Err(AppError::NotFound(
            "No Game matches the given query.".into(),
        ))
    }
}

/// Member ids on one team of a game (ordered).
async fn team_ids(app: &AppState, game_id: i64, team: i64) -> Result<Vec<i64>, AppError> {
    let rows = if team == 1 {
        sqlx::query_scalar!(
            r#"SELECT member_id AS "member_id!: i64" FROM game_team1 WHERE game_id = ? ORDER BY member_id"#,
            game_id
        )
        .fetch_all(&app.pool)
        .await?
    } else {
        sqlx::query_scalar!(
            r#"SELECT member_id AS "member_id!: i64" FROM game_team2 WHERE game_id = ? ORDER BY member_id"#,
            game_id
        )
        .fetch_all(&app.pool)
        .await?
    };
    Ok(rows)
}

/// All member ids in a game (team1 + team2).
async fn team_member_ids(app: &AppState, game_id: i64) -> Result<Vec<i64>, AppError> {
    let t1 = team_ids(app, game_id, 1).await?;
    let t2 = team_ids(app, game_id, 2).await?;
    Ok(t1.into_iter().chain(t2).collect())
}

/// Build the `MemberSerializer` rows for one team, with each member's ELO for the
/// game type (`get_elo`: `null` if the game type or rating row is absent).
async fn team_members_out(
    app: &AppState,
    game_id: i64,
    team: i64,
    game_type_name: Option<&str>,
) -> Result<Vec<MemberOut>, AppError> {
    let ids = team_ids(app, game_id, team).await?;
    let mut out = Vec::with_capacity(ids.len());
    for member_id in ids {
        let r = sqlx::query!(
            r#"SELECT m.id AS "id!: i64", m.user_id AS "user_id!: i64",
                      u.username AS "username!: String", u.first_name, u.surname
               FROM members m JOIN users u ON u.id = m.user_id WHERE m.id = ?"#,
            member_id
        )
        .fetch_one(&app.pool)
        .await?;
        let elo = match game_type_name {
            Some(name) => {
                sqlx::query_scalar!(
                    r#"SELECT e.elo AS "elo!: i64" FROM user_elos ue
                   JOIN elo e ON e.id = ue.elo_id
                   JOIN game_types gt ON gt.id = e.game_type_id
                   WHERE ue.user_id = ? AND gt.name = ? LIMIT 1"#,
                    r.user_id,
                    name
                )
                .fetch_optional(&app.pool)
                .await?
            }
            None => None,
        };
        out.push(MemberOut {
            id: r.id.into(),
            username: r.username,
            first_name: r.first_name,
            surname: r.surname,
            elo,
        });
    }
    Ok(out)
}

async fn game_out(
    app: &AppState,
    game_id: i64,
    game_type_name: Option<&str>,
) -> Result<GameOut, AppError> {
    Ok(GameOut {
        id: game_id.into(),
        team1: team_members_out(app, game_id, 1, game_type_name).await?,
        team2: team_members_out(app, game_id, 2, game_type_name).await?,
    })
}

async fn complete_game_out(
    app: &AppState,
    game_id: i64,
    game_type_name: Option<&str>,
) -> Result<CompleteGameOut, AppError> {
    let g = sqlx::query!(
        r#"SELECT game_type_id AS "game_type_id?: i64", score, start_time
           FROM games WHERE id = ?"#,
        game_id
    )
    .fetch_one(&app.pool)
    .await?;
    Ok(CompleteGameOut {
        id: game_id.into(),
        team1: team_members_out(app, game_id, 1, game_type_name).await?,
        team2: team_members_out(app, game_id, 2, game_type_name).await?,
        game_type: g.game_type_id,
        game_type_name: game_type_name.map(str::to_owned),
        score: g.score,
        start_time: g.start_time,
    })
}

/// Load the event's `player_match_counts` map.
async fn load_match_counts(
    app: &AppState,
    event_id: i64,
) -> Result<BTreeMap<String, i64>, AppError> {
    let raw = sqlx::query_scalar!(
        "SELECT player_match_counts FROM events WHERE id = ?",
        event_id
    )
    .fetch_one(&app.pool)
    .await?;
    Ok(parse_int_map(&raw))
}

/// Load the event's `played_with` nested map, keyed by member id (i64).
async fn load_played_with(
    app: &AppState,
    event_id: i64,
) -> Result<std::collections::HashMap<i64, std::collections::HashMap<i64, i64>>, AppError> {
    let raw = sqlx::query_scalar!("SELECT played_with FROM events WHERE id = ?", event_id)
        .fetch_one(&app.pool)
        .await?;
    let parsed = parse_nested_map(&raw);
    let mut out = std::collections::HashMap::new();
    for (k, inner) in parsed {
        let Ok(outer_id) = k.parse::<i64>() else {
            continue;
        };
        let mut inner_map = std::collections::HashMap::new();
        for (ik, iv) in inner {
            if let Ok(inner_id) = ik.parse::<i64>() {
                inner_map.insert(inner_id, iv);
            }
        }
        out.insert(outer_id, inner_map);
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn number_in_team_by_suffix() {
        assert_eq!(number_in_team(Some("badminton singles")), Some(1));
        assert_eq!(number_in_team(Some("tennis doubles")), Some(2));
        assert_eq!(number_in_team(Some("chess")), None);
        assert_eq!(number_in_team(None), None);
    }

    #[test]
    fn parse_score_accepts_valid() {
        assert_eq!(parse_score("21,15").unwrap(), (21, 15));
        assert_eq!(parse_score(" 19 , 21 ").unwrap(), (19, 21));
    }

    #[test]
    fn parse_score_rejects_invalid() {
        assert!(matches!(parse_score("21"), Err(AppError::Validation(_))));
        assert!(matches!(parse_score("a,b"), Err(AppError::Validation(_))));
        assert!(matches!(parse_score("1,2,3"), Err(AppError::Validation(_))));
    }
}
