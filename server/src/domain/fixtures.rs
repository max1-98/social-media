//! Club-vs-club fixtures + club ELO (Phase 9).
//!
//! A *fixture* is a scheduled match between two clubs. Lifecycle:
//! `proposed -> accepted/declined -> played -> confirmed` (both clubs confirm),
//! or `cancelled` before confirmation. The linked games are real `games` rows
//! scoped `external`, so they move each player's **external** rating (the
//! intra-club `internal` rating is never touched) and the two clubs' `club_elo`.
//!
//! Rating only moves once **both** clubs confirm the result — a one-sided
//! confirmation settles nothing. Only verified, active, non-dummy members may
//! play a fixture game (the "no dummies" gate, GDPR + fairness).
//!
//! Ports the legacy club-fixtures app; the pure club-rating math lives in
//! [`crate::domain::club_elo`] so it can be oracle-tested.

use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

use crate::domain::auth::AuthUser;
use crate::domain::club_elo::{self, FixtureOutcome};
use crate::domain::games;
use crate::error::AppError;
use crate::id::{ApiPath, ClubId, FixtureId, GameId, MemberId};
use crate::rating;
use crate::skill;
use crate::state::AppState;

fn now() -> OffsetDateTime {
    OffsetDateTime::now_utc()
}

fn fmt_ts(t: OffsetDateTime) -> Result<String, AppError> {
    t.format(&Rfc3339)
        .map_err(|_| AppError::Internal("timestamp formatting failed".into()))
}

// ===========================================================================
// Response shapes
// ===========================================================================

/// A fixture summary (`club_fixtures` row). Ids cross the wire as Sqids.
#[derive(Debug, Serialize)]
pub struct FixtureOut {
    /// Opaque `FixtureId`.
    id: FixtureId,
    /// Opaque `ClubId` of the home (proposing) club.
    home_club: ClubId,
    /// Opaque `ClubId` of the away club.
    away_club: ClubId,
    home_club_name: String,
    away_club_name: String,
    /// Raw `game_types.id` (small public taxonomy, not obfuscated), or null.
    game_type: Option<i64>,
    game_type_name: Option<String>,
    date: Option<String>,
    status: String,
    created_at: String,
}

/// One linked game inside a fixture detail.
#[derive(Debug, Serialize)]
pub struct FixtureGameOut {
    /// Opaque `GameId`.
    id: GameId,
    /// Opaque `MemberId`s on each side.
    home_team: Vec<MemberId>,
    away_team: Vec<MemberId>,
    score: Option<String>,
}

/// One club's confirmation state for a fixture.
#[derive(Debug, Serialize)]
pub struct ConfirmationOut {
    /// Opaque `ClubId`.
    club: ClubId,
    status: String,
    confirmed_at: Option<String>,
}

/// Full fixture detail: the summary + linked games + confirmations.
#[derive(Debug, Serialize)]
pub struct FixtureDetailOut {
    #[serde(flatten)]
    fixture: FixtureOut,
    games: Vec<FixtureGameOut>,
    confirmations: Vec<ConfirmationOut>,
}

/// A row on the club leaderboard.
#[derive(Debug, Serialize)]
pub struct ClubLadderEntry {
    /// Opaque `ClubId`.
    id: ClubId,
    name: String,
    club_username: String,
    /// Club ELO (`club_elo.elo`); the model default until the club plays.
    elo: i64,
    games_played: i64,
    /// Aggregate member strength: mean external conservative rating of the
    /// club's real (verified, active, non-dummy) members, computed on read.
    member_strength: Option<i64>,
}

// ===========================================================================
// Permission helpers (this module owns its own, mirroring games.rs).
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

/// 403 unless `user_id` administers `club_id` (404 if the club is missing).
async fn require_club_admin(app: &AppState, user_id: i64, club_id: i64) -> Result<(), AppError> {
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

// ===========================================================================
// No-dummies / eligibility gate.
// ===========================================================================

/// Reject if any member id fails to resolve to an eligible real user: the user
/// must be active, email-verified, and NOT a `dummyuser_*` placeholder. Used
/// before any external (club-vs-club) game is persisted so fixtures can never
/// move ratings using bots or unverified accounts.
pub(crate) async fn external_eligible(app: &AppState, member_ids: &[i64]) -> Result<(), AppError> {
    for &member_id in member_ids {
        let row = sqlx::query!(
            r#"SELECT u.username AS "username!: String",
                      u.is_active AS "is_active!: i64",
                      u.email_verified AS "email_verified!: i64"
               FROM members m JOIN users u ON u.id = m.user_id
               WHERE m.id = ?"#,
            member_id
        )
        .fetch_optional(&app.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("No Member matches the given query.".into()))?;

        let ineligible =
            row.is_active == 0 || row.email_verified == 0 || row.username.starts_with("dummyuser_");
        if ineligible {
            return Err(AppError::Validation(
                "Fixture games may only include verified, active, real members.".into(),
            ));
        }
    }
    Ok(())
}

// ===========================================================================
// Fixture lookups.
// ===========================================================================

struct FixtureCore {
    id: i64,
    home_club_id: i64,
    away_club_id: i64,
    game_type_id: Option<i64>,
    status: String,
}

async fn fixture_core(app: &AppState, fixture_id: i64) -> Result<FixtureCore, AppError> {
    let r = sqlx::query!(
        r#"SELECT id AS "id!: i64", home_club_id AS "home_club_id!: i64",
                  away_club_id AS "away_club_id!: i64", game_type_id AS "game_type_id?: i64",
                  status AS "status!: String"
           FROM club_fixtures WHERE id = ?"#,
        fixture_id
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No fixture matches the given query.".into()))?;
    Ok(FixtureCore {
        id: r.id,
        home_club_id: r.home_club_id,
        away_club_id: r.away_club_id,
        game_type_id: r.game_type_id,
        status: r.status,
    })
}

async fn fixture_out(app: &AppState, fixture_id: i64) -> Result<FixtureOut, AppError> {
    let r = sqlx::query!(
        r#"SELECT f.id AS "id!: i64", f.home_club_id AS "home_club_id!: i64",
                  f.away_club_id AS "away_club_id!: i64", f.game_type_id AS "game_type_id?: i64",
                  f.date AS "date?: String", f.status AS "status!: String",
                  f.created_at AS "created_at!: String",
                  hc.name AS "home_name!: String", ac.name AS "away_name!: String",
                  gt.name AS "game_type_name?: String"
           FROM club_fixtures f
           JOIN clubs hc ON hc.id = f.home_club_id
           JOIN clubs ac ON ac.id = f.away_club_id
           LEFT JOIN game_types gt ON gt.id = f.game_type_id
           WHERE f.id = ?"#,
        fixture_id
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No fixture matches the given query.".into()))?;
    Ok(FixtureOut {
        id: r.id.into(),
        home_club: r.home_club_id.into(),
        away_club: r.away_club_id.into(),
        home_club_name: r.home_name,
        away_club_name: r.away_name,
        game_type: r.game_type_id,
        game_type_name: r.game_type_name,
        date: r.date,
        status: r.status,
        created_at: r.created_at,
    })
}

// ===========================================================================
// Lifecycle: propose / accept / decline / cancel.
// ===========================================================================

#[derive(Deserialize)]
pub struct ProposeRequest {
    away_club: ClubId,
    /// Optional game-type name (resolved to `game_types.id`; 404 if unknown).
    game_type: Option<String>,
    date: Option<String>,
}

/// POST /api/club/:pk/fixtures — the home club's admin proposes a fixture.
pub async fn propose_fixture(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
    Json(req): Json<ProposeRequest>,
) -> Result<(StatusCode, Json<FixtureOut>), AppError> {
    let home_club_id = pk.inner();
    require_club_admin(&app, user.id, home_club_id).await?;

    let away_club_id = req.away_club.inner();
    if away_club_id == home_club_id {
        return Err(AppError::Validation(
            "A club cannot play a fixture against itself.".into(),
        ));
    }
    if !club_exists(&app, away_club_id).await? {
        return Err(AppError::NotFound(
            "No ClubModel matches the given query.".into(),
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
    let created_at = fmt_ts(now())?;
    let id = sqlx::query_scalar!(
        r#"INSERT INTO club_fixtures
             (home_club_id, away_club_id, game_type_id, date, status, created_by, created_at)
           VALUES (?, ?, ?, ?, 'proposed', ?, ?)
           RETURNING id AS "id!: i64""#,
        home_club_id,
        away_club_id,
        game_type_id,
        req.date,
        user.id,
        created_at
    )
    .fetch_one(&app.pool)
    .await?;

    Ok((StatusCode::CREATED, Json(fixture_out(&app, id).await?)))
}

/// POST /api/fixture/:id/accept — the away club's admin accepts a proposal.
pub async fn accept_fixture(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(id): ApiPath<FixtureId>,
) -> Result<Json<FixtureOut>, AppError> {
    set_proposal_status(&app, user.id, id.inner(), "accepted").await
}

/// POST /api/fixture/:id/decline — the away club's admin declines a proposal.
pub async fn decline_fixture(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(id): ApiPath<FixtureId>,
) -> Result<Json<FixtureOut>, AppError> {
    set_proposal_status(&app, user.id, id.inner(), "declined").await
}

/// Shared accept/decline: only the away-club admin, only while `proposed`.
async fn set_proposal_status(
    app: &AppState,
    user_id: i64,
    fixture_id: i64,
    new_status: &str,
) -> Result<Json<FixtureOut>, AppError> {
    let f = fixture_core(app, fixture_id).await?;
    require_club_admin(app, user_id, f.away_club_id).await?;
    if f.status != "proposed" {
        return Err(AppError::Validation(
            "Only a proposed fixture can be accepted or declined.".into(),
        ));
    }
    sqlx::query!(
        "UPDATE club_fixtures SET status = ? WHERE id = ?",
        new_status,
        fixture_id
    )
    .execute(&app.pool)
    .await?;
    Ok(Json(fixture_out(app, fixture_id).await?))
}

/// POST /api/fixture/:id/cancel — an admin of either club cancels, but only
/// before the result is confirmed.
pub async fn cancel_fixture(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(id): ApiPath<FixtureId>,
) -> Result<Json<FixtureOut>, AppError> {
    let fixture_id = id.inner();
    let f = fixture_core(&app, fixture_id).await?;
    let admin = is_admin(&app, user.id, f.home_club_id).await?
        || is_admin(&app, user.id, f.away_club_id).await?;
    if !admin {
        return Err(AppError::Forbidden(
            "You do not have permission to perform this action.".into(),
        ));
    }
    if f.status == "confirmed" {
        return Err(AppError::Validation(
            "A confirmed fixture cannot be cancelled.".into(),
        ));
    }
    sqlx::query!(
        "UPDATE club_fixtures SET status = 'cancelled' WHERE id = ?",
        fixture_id
    )
    .execute(&app.pool)
    .await?;
    Ok(Json(fixture_out(&app, fixture_id).await?))
}

// ===========================================================================
// Reads.
// ===========================================================================

/// GET /api/club/:pk/fixtures — fixtures where the club is home or away.
/// Member-visible.
pub async fn list_club_fixtures(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
) -> Result<Json<Vec<FixtureOut>>, AppError> {
    let club_id = pk.inner();
    if !club_exists(&app, club_id).await? {
        return Err(AppError::NotFound(
            "No ClubModel matches the given query.".into(),
        ));
    }
    if !is_member(&app, user.id, club_id).await? {
        return Err(AppError::Forbidden(
            "You do not have permission to perform this action.".into(),
        ));
    }
    let ids = sqlx::query_scalar!(
        r#"SELECT id AS "id!: i64" FROM club_fixtures
           WHERE home_club_id = ? OR away_club_id = ? ORDER BY id DESC"#,
        club_id,
        club_id
    )
    .fetch_all(&app.pool)
    .await?;
    let mut out = Vec::with_capacity(ids.len());
    for id in ids {
        out.push(fixture_out(&app, id).await?);
    }
    Ok(Json(out))
}

/// GET /api/fixture/:id — fixture summary + linked games + confirmations.
pub async fn fixture_detail(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(id): ApiPath<FixtureId>,
) -> Result<Json<FixtureDetailOut>, AppError> {
    let fixture_id = id.inner();
    let f = fixture_core(&app, fixture_id).await?;
    let visible = is_member(&app, user.id, f.home_club_id).await?
        || is_member(&app, user.id, f.away_club_id).await?;
    if !visible {
        return Err(AppError::Forbidden(
            "You do not have permission to perform this action.".into(),
        ));
    }

    let game_ids = sqlx::query_scalar!(
        r#"SELECT game_id AS "game_id!: i64" FROM fixture_games
           WHERE fixture_id = ? ORDER BY game_id"#,
        fixture_id
    )
    .fetch_all(&app.pool)
    .await?;
    let mut games_out = Vec::with_capacity(game_ids.len());
    for gid in game_ids {
        let score = sqlx::query_scalar!(
            r#"SELECT score AS "score?: String" FROM games WHERE id = ?"#,
            gid
        )
        .fetch_optional(&app.pool)
        .await?
        .flatten();
        games_out.push(FixtureGameOut {
            id: gid.into(),
            home_team: member_ids_of(&app, gid, 1).await?,
            away_team: member_ids_of(&app, gid, 2).await?,
            score,
        });
    }

    let confirmations = sqlx::query!(
        r#"SELECT club_id AS "club_id!: i64", status AS "status!: String",
                  confirmed_at AS "confirmed_at?: String"
           FROM result_confirmations WHERE fixture_id = ? ORDER BY id"#,
        fixture_id
    )
    .fetch_all(&app.pool)
    .await?
    .into_iter()
    .map(|r| ConfirmationOut {
        club: r.club_id.into(),
        status: r.status,
        confirmed_at: r.confirmed_at,
    })
    .collect();

    Ok(Json(FixtureDetailOut {
        fixture: fixture_out(&app, fixture_id).await?,
        games: games_out,
        confirmations,
    }))
}

async fn member_ids_of(app: &AppState, game_id: i64, team: i64) -> Result<Vec<MemberId>, AppError> {
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
    Ok(rows.into_iter().map(Into::into).collect())
}

// ===========================================================================
// Recording a fixture game (creates an external-scoped game + scores it).
// ===========================================================================

#[derive(Deserialize)]
pub struct RecordGameRequest {
    /// Home-club members on team 1 (opaque `MemberId`s).
    home_team: Vec<MemberId>,
    /// Away-club members on team 2.
    away_team: Vec<MemberId>,
    /// `"s1,s2"`; the winning side must reach 21 (parity with internal games).
    score: String,
}

/// POST /api/fixture/:id/games — an admin of either club records a played game.
/// Enforces the no-dummies gate, persists an external-scoped `games` row, links
/// it to the fixture, runs external rating, and marks the fixture `played`.
pub async fn record_fixture_game(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(id): ApiPath<FixtureId>,
    Json(req): Json<RecordGameRequest>,
) -> Result<(StatusCode, Json<FixtureGameOut>), AppError> {
    let fixture_id = id.inner();
    let f = fixture_core(&app, fixture_id).await?;
    let admin = is_admin(&app, user.id, f.home_club_id).await?
        || is_admin(&app, user.id, f.away_club_id).await?;
    if !admin {
        return Err(AppError::Forbidden(
            "You do not have permission to perform this action.".into(),
        ));
    }
    if f.status != "accepted" && f.status != "played" {
        return Err(AppError::Validation(
            "Games can only be recorded on an accepted fixture.".into(),
        ));
    }

    let team1: Vec<i64> = req.home_team.iter().map(MemberId::inner).collect();
    let team2: Vec<i64> = req.away_team.iter().map(MemberId::inner).collect();
    if team1.is_empty() || team2.is_empty() {
        return Err(AppError::Validation(
            "Both teams must have at least one player.".into(),
        ));
    }

    // Membership: each side's players must belong to the respective club.
    members_in_club(&app, &team1, f.home_club_id).await?;
    members_in_club(&app, &team2, f.away_club_id).await?;

    // No-dummies gate: reject before any write.
    let all: Vec<i64> = team1.iter().chain(&team2).copied().collect();
    external_eligible(&app, &all).await?;

    // Score validation (same rule as internal games).
    let (s1, s2) = parse_score(&req.score)?;
    if !(s1 >= 21 || s2 >= 21) {
        return Err(AppError::Validation(
            "Invalid score. Winning team must have 21 or more points.".into(),
        ));
    }
    let team1_won = rating::team1_win(&req.score)?;
    let diff = rating::score_difference(&req.score)?;

    let start_time = fmt_ts(now())?;
    let game_id = sqlx::query_scalar!(
        r#"INSERT INTO games (game_type_id, start_time, score, scope)
           VALUES (?, ?, ?, 'external')
           RETURNING id AS "id!: i64""#,
        f.game_type_id,
        start_time,
        req.score
    )
    .fetch_one(&app.pool)
    .await?;

    for &member_id in &team1 {
        link_team_member(&app, game_id, member_id, 1).await?;
    }
    for &member_id in &team2 {
        link_team_member(&app, game_id, member_id, 2).await?;
    }
    sqlx::query!(
        "INSERT OR IGNORE INTO fixture_games (fixture_id, game_id) VALUES (?, ?)",
        fixture_id,
        game_id
    )
    .execute(&app.pool)
    .await?;

    // Move each real player's EXTERNAL rating (internal untouched). sbmm=true so
    // ratings actually move for a competitive fixture.
    games::update_elo(
        &app,
        game_id,
        f.game_type_id,
        &team1,
        &team2,
        team1_won,
        diff,
        true,
        "external",
    )
    .await?;

    sqlx::query!(
        "UPDATE club_fixtures SET status = 'played' WHERE id = ?",
        fixture_id
    )
    .execute(&app.pool)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(FixtureGameOut {
            id: game_id.into(),
            home_team: req.home_team,
            away_team: req.away_team,
            score: Some(req.score),
        }),
    ))
}

async fn members_in_club(app: &AppState, member_ids: &[i64], club_id: i64) -> Result<(), AppError> {
    for &member_id in member_ids {
        let ok = sqlx::query_scalar!(
            r#"SELECT 1 AS "x!: i64" FROM members WHERE id = ? AND club_id = ? LIMIT 1"#,
            member_id,
            club_id
        )
        .fetch_optional(&app.pool)
        .await?
        .is_some();
        if !ok {
            return Err(AppError::Validation(
                "A player does not belong to the expected club.".into(),
            ));
        }
    }
    Ok(())
}

async fn link_team_member(
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

// ===========================================================================
// Confirmation + settlement (both clubs confirm -> ratings move).
// ===========================================================================

/// POST /api/fixture/:id/confirm — an admin of one club confirms the result.
/// When BOTH clubs have confirmed, the fixture settles: external player ratings
/// were already applied per game; here the two clubs' `club_elo` move and the
/// fixture becomes `confirmed`. A one-sided confirmation moves nothing.
pub async fn confirm_fixture(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(id): ApiPath<FixtureId>,
) -> Result<Json<FixtureDetailOut>, AppError> {
    let fixture_id = id.inner();
    let f = fixture_core(&app, fixture_id).await?;

    let club_id = if is_admin(&app, user.id, f.home_club_id).await? {
        f.home_club_id
    } else if is_admin(&app, user.id, f.away_club_id).await? {
        f.away_club_id
    } else {
        return Err(AppError::Forbidden(
            "You do not have permission to perform this action.".into(),
        ));
    };

    if f.status != "played" && f.status != "confirmed" {
        return Err(AppError::Validation(
            "Only a played fixture can be confirmed.".into(),
        ));
    }

    let confirmed_at = fmt_ts(now())?;
    sqlx::query!(
        r#"INSERT INTO result_confirmations (fixture_id, club_id, confirmed_by, status, confirmed_at)
           VALUES (?, ?, ?, 'confirmed', ?)
           ON CONFLICT (fixture_id, club_id)
           DO UPDATE SET status = 'confirmed', confirmed_by = excluded.confirmed_by,
                         confirmed_at = excluded.confirmed_at"#,
        fixture_id,
        club_id,
        user.id,
        confirmed_at
    )
    .execute(&app.pool)
    .await?;

    let both = both_confirmed(&app, fixture_id, &f).await?;
    if both && f.status != "confirmed" {
        settle_fixture(&app, &f).await?;
        sqlx::query!(
            "UPDATE club_fixtures SET status = 'confirmed' WHERE id = ?",
            fixture_id
        )
        .execute(&app.pool)
        .await?;
    }

    fixture_detail(State(app), user, ApiPath(FixtureId::from_raw(fixture_id))).await
}

async fn both_confirmed(
    app: &AppState,
    fixture_id: i64,
    f: &FixtureCore,
) -> Result<bool, AppError> {
    let count = sqlx::query_scalar!(
        r#"SELECT COUNT(*) AS "n!: i64" FROM result_confirmations
           WHERE fixture_id = ? AND status = 'confirmed' AND club_id IN (?, ?)"#,
        fixture_id,
        f.home_club_id,
        f.away_club_id
    )
    .fetch_one(&app.pool)
    .await?;
    Ok(count >= 2)
}

/// Move both clubs' `club_elo` based on the aggregate of the linked games.
/// Player external ratings were already applied when each game was recorded.
async fn settle_fixture(app: &AppState, f: &FixtureCore) -> Result<(), AppError> {
    // Tally games won by each club across the fixture.
    let game_ids = sqlx::query_scalar!(
        r#"SELECT game_id AS "game_id!: i64" FROM fixture_games WHERE fixture_id = ?"#,
        f.id
    )
    .fetch_all(&app.pool)
    .await?;

    let mut home_wins: u32 = 0;
    let mut away_wins: u32 = 0;
    for gid in game_ids {
        let score = sqlx::query_scalar!(
            r#"SELECT score AS "score?: String" FROM games WHERE id = ?"#,
            gid
        )
        .fetch_optional(&app.pool)
        .await?
        .flatten();
        if let Some(score) = score {
            if rating::team1_win(&score)? {
                home_wins += 1;
            } else {
                away_wins += 1;
            }
        }
    }

    let outcome = club_elo::outcome(home_wins, away_wins);
    let margin = (home_wins as i64 - away_wins as i64).unsigned_abs() as f64;

    let model = skill::model_for(skill::wenglin::VERSION);
    let home = load_club_state(app, f.home_club_id, f.game_type_id, model.as_ref()).await?;
    let away = load_club_state(app, f.away_club_id, f.game_type_id, model.as_ref()).await?;

    let (new_home, new_away) =
        club_elo::update_clubs(model.as_ref(), &home, &away, outcome, margin);

    // A draw leaves states untouched but still records that a fixture happened.
    let bump = if outcome == FixtureOutcome::Draw {
        0
    } else {
        1
    };
    save_club_state(app, f.home_club_id, f.game_type_id, &new_home, bump).await?;
    save_club_state(app, f.away_club_id, f.game_type_id, &new_away, bump).await?;
    Ok(())
}

async fn load_club_state(
    app: &AppState,
    club_id: i64,
    game_type_id: Option<i64>,
    model: &dyn skill::RatingModel,
) -> Result<skill::SkillState, AppError> {
    let row = sqlx::query!(
        r#"SELECT mu AS "mu!: f64", sigma AS "sigma!: f64",
                  games_played AS "games_played!: i64", extra AS "extra!: String"
           FROM club_elo WHERE club_id = ? AND game_type_id IS ? LIMIT 1"#,
        club_id,
        game_type_id
    )
    .fetch_optional(&app.pool)
    .await?;
    Ok(match row {
        Some(r) => skill::SkillState {
            mu: r.mu,
            sigma: r.sigma,
            games_played: r.games_played.max(0) as u32,
            extra: serde_json::from_str(&r.extra).unwrap_or(Value::Null),
        },
        None => model.default_state(),
    })
}

async fn save_club_state(
    app: &AppState,
    club_id: i64,
    game_type_id: Option<i64>,
    rating: &club_elo::ClubRating,
    games_bump: i64,
) -> Result<(), AppError> {
    let updated_at = fmt_ts(now())?;
    let extra = rating.state.extra.to_string();
    let version = skill::wenglin::VERSION;
    sqlx::query!(
        r#"INSERT INTO club_elo
             (club_id, game_type_id, mu, sigma, games_played, model_version, extra, elo, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (club_id, game_type_id)
           DO UPDATE SET mu = excluded.mu, sigma = excluded.sigma,
                         games_played = club_elo.games_played + ?,
                         model_version = excluded.model_version, extra = excluded.extra,
                         elo = excluded.elo, updated_at = excluded.updated_at"#,
        club_id,
        game_type_id,
        rating.state.mu,
        rating.state.sigma,
        games_bump,
        version,
        extra,
        rating.elo,
        updated_at,
        games_bump
    )
    .execute(&app.pool)
    .await?;
    Ok(())
}

// ===========================================================================
// Club leaderboard.
// ===========================================================================

#[derive(Deserialize)]
pub struct LeaderboardQuery {
    /// Optional game-type name to scope the ladder to one game type.
    game_type: Option<String>,
}

/// GET /api/leaderboards/clubs — club ELO ladder (highest first). Each row also
/// carries a read-time "member strength": the mean external conservative rating
/// of the club's real, verified, active, non-dummy members for the game type.
pub async fn club_leaderboard(
    State(app): State<AppState>,
    _user: AuthUser,
    Query(q): Query<LeaderboardQuery>,
) -> Result<Json<Vec<ClubLadderEntry>>, AppError> {
    let game_type_id = match q.game_type.as_deref() {
        Some(name) => Some(
            sqlx::query_scalar!("SELECT id FROM game_types WHERE name = ?", name)
                .fetch_optional(&app.pool)
                .await?
                .ok_or_else(|| AppError::NotFound("No GameType matches the given query.".into()))?,
        ),
        None => None,
    };

    // Clubs with a club_elo row for the scope, ordered by elo.
    let rows = sqlx::query!(
        r#"SELECT c.id AS "club_id!: i64", c.name AS "name!: String",
                  c.club_username AS "club_username!: String",
                  ce.elo AS "elo!: i64", ce.games_played AS "games_played!: i64"
           FROM club_elo ce JOIN clubs c ON c.id = ce.club_id
           WHERE ce.game_type_id IS ?
           ORDER BY ce.elo DESC, c.id ASC"#,
        game_type_id
    )
    .fetch_all(&app.pool)
    .await?;

    let mut out = Vec::with_capacity(rows.len());
    for r in rows {
        let member_strength = club_member_strength(&app, r.club_id, game_type_id).await?;
        out.push(ClubLadderEntry {
            id: r.club_id.into(),
            name: r.name,
            club_username: r.club_username,
            elo: r.elo,
            games_played: r.games_played,
            member_strength,
        });
    }
    Ok(Json(out))
}

/// Mean of each real member's external `elo` for the game type (rounded), or
/// `None` if the club has no eligible rated members.
async fn club_member_strength(
    app: &AppState,
    club_id: i64,
    game_type_id: Option<i64>,
) -> Result<Option<i64>, AppError> {
    let elos = sqlx::query_scalar!(
        r#"SELECT e.elo AS "elo!: i64"
           FROM members m
           JOIN users u ON u.id = m.user_id
           JOIN user_elos ue ON ue.user_id = u.id
           JOIN elo e ON e.id = ue.elo_id
           WHERE m.club_id = ? AND m.is_member = 1
             AND u.is_active = 1 AND u.email_verified = 1
             AND u.username NOT LIKE 'dummyuser\_%' ESCAPE '\'
             AND e.scope = 'external' AND e.game_type_id IS ?"#,
        club_id,
        game_type_id
    )
    .fetch_all(&app.pool)
    .await?;
    if elos.is_empty() {
        return Ok(None);
    }
    let sum: i64 = elos.iter().sum();
    Ok(Some(sum / elos.len() as i64))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_score_accepts_and_rejects() {
        assert_eq!(parse_score("21,15").unwrap(), (21, 15));
        assert!(parse_score("nonsense").is_err());
        assert!(parse_score("1,2,3").is_err());
    }
}
