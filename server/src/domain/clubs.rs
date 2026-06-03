//! Clubs: clubs, members, member requests, dummy users, sports, club socials,
//! logo upload (signed media), and address geocoding (Nominatim).
//!
//! Ports: `backend/clubs/` (models, services, permissions, views) plus the two
//! events helpers the club serializers depend on (`get_recent_event_date`,
//! `get_events_this_month`). JSON shapes mirror the Django serializers exactly.

use axum::extract::{Multipart, Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use time::format_description::well_known::Rfc3339;
use time::macros::format_description;
use time::{Date, Duration, OffsetDateTime};

use crate::domain::auth::AuthUser;
use crate::error::AppError;
use crate::id::{ApiPath, ClubId, EventId, MemberId, RequestId, UserId};
use crate::media::validate_image;
use crate::state::AppState;

// ===========================================================================
// Pure helpers (unit-tested below)
// ===========================================================================

/// Port of `serializers.average_attendance`: mean attendance over a set of
/// events, where each event contributes its `played_one_match` count.
fn average_attendance(attendance_counts: &[i64]) -> f64 {
    if attendance_counts.is_empty() {
        return 0.0;
    }
    let total: i64 = attendance_counts.iter().sum();
    total as f64 / attendance_counts.len() as f64
}

/// Mirror of `ClubSerializer.get_membership_status`: 2 member, 1 pending, 0 none.
fn membership_status(is_member: bool, has_request: bool) -> i64 {
    if is_member {
        2
    } else if has_request {
        1
    } else {
        0
    }
}

/// Mirror of `get_is_event_upcoming`: given the most recent event date (if any),
/// it is "upcoming" unless that date + 1 day is already in the past.
fn is_event_upcoming(recent: Option<Date>, today: Date) -> bool {
    match recent {
        None => false,
        Some(date) => date + Duration::days(1) >= today,
    }
}

/// Validate the create-club inputs, mirroring `services.create_club`. Returns the
/// `ValueError` strings verbatim so parity tests match the legacy messages.
fn validate_create_club(club_username: &str, name: &str, info: &str) -> Result<(), AppError> {
    if club_username.is_empty() {
        return Err(AppError::Validation(
            "Please provide a club username.".into(),
        ));
    }
    if club_username.chars().count() > 12 {
        return Err(AppError::Validation(
            "Username must be less than 12 characters.".into(),
        ));
    }
    if name.is_empty() {
        return Err(AppError::Validation("Please provide a club name.".into()));
    }
    if name.chars().count() > 50 {
        return Err(AppError::Validation(
            "Club name must be less than 50 characters.".into(),
        ));
    }
    if info.chars().count() > 160 {
        return Err(AppError::Validation(
            "Club description must be less than 160 characters.".into(),
        ));
    }
    Ok(())
}

/// Port of `social_views.standardize_url`. Normalises a URL to
/// `http://www.[host]...` or returns `None` if it can't be made valid.
fn standardize_url(url: &str) -> Option<String> {
    fn valid(u: &str) -> bool {
        // Mirror of the `validators.url` gate the legacy used: an absolute URL
        // with a scheme and a dotted host.
        let Some((_, rest)) = u.split_once("://") else {
            return false;
        };
        let host = rest.split(['/', '?', '#']).next().unwrap_or(rest);
        host.contains('.') && !host.is_empty()
    }

    if !valid(url) {
        if url.starts_with("www") {
            return standardize_url(&format!("http://{url}"));
        }
        return None;
    }

    let (_, after) = url.split_once("://")?;
    let netloc = after.split(['/', '?', '#']).next().unwrap_or(after);
    let netloc = netloc.trim_end_matches('/');
    let path = &after[netloc.len()..];

    let netloc = if netloc.starts_with("www.") {
        netloc.to_string()
    } else if netloc.contains('.') {
        format!("www.{netloc}")
    } else {
        return None;
    };

    Some(format!("http://{netloc}{path}"))
}

/// Port of `social_views.check_valid`: standardise then enforce the per-platform
/// host rule. Returns the standardized URL on success.
fn check_valid(url: &str, site: &str) -> Option<String> {
    let url = standardize_url(url)?;
    match site {
        "website" => Some(url),
        "whatsapp" => url.contains("chat.whatsapp").then(|| url.clone()),
        _ => {
            // Legacy: url[11:11+len(site)+4] == site + ".com"; index 11 is just
            // past the "http://www." prefix standardize_url guarantees.
            let needle = format!("{site}.com");
            let start = 11;
            let end = start + needle.len();
            if url.len() >= end && url.is_char_boundary(start) && url[start..end] == needle {
                Some(url.clone())
            } else {
                None
            }
        }
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

/// Short random suffix for the unusable dummy-user password placeholder.
fn random_suffix() -> String {
    use rand::Rng;
    rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(12)
        .map(char::from)
        .collect()
}

// ===========================================================================
// Permission helpers (port of permissions.py)
// ===========================================================================

/// Is `user_id` an active member of `club_id`?
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

/// Is `user_id` an admin of `club_id`?
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

/// Fetch a club's president id or 404.
async fn club_president(app: &AppState, club_id: i64) -> Result<i64, AppError> {
    sqlx::query_scalar!("SELECT president_id FROM clubs WHERE id = ?", club_id)
        .fetch_optional(&app.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("No ClubModel matches the given query.".into()))
}

/// `IsClubAdmin` analogue: 403 unless `user_id` administers `club_id`.
async fn require_admin(app: &AppState, user_id: i64, club_id: i64) -> Result<(), AppError> {
    // Ensure the club exists (404 parity) before the permission check.
    club_president(app, club_id).await?;
    if is_admin(app, user_id, club_id).await? {
        Ok(())
    } else {
        Err(AppError::Forbidden(
            "You do not have permission to perform this action.".into(),
        ))
    }
}

/// `IsClubPresident` analogue: 403 unless `user_id` is the club president.
async fn require_president(app: &AppState, user_id: i64, club_id: i64) -> Result<(), AppError> {
    let president = club_president(app, club_id).await?;
    if president == user_id {
        Ok(())
    } else {
        Err(AppError::Forbidden(
            "You do not have permission to perform this action.".into(),
        ))
    }
}

// ===========================================================================
// Event-helper queries (port of events/fetch_events.py for the serializers)
// ===========================================================================

/// `get_recent_event_date`: max event date for a club (may be in the future).
async fn recent_event_date(app: &AppState, club_id: i64) -> Result<Option<Date>, AppError> {
    let max = sqlx::query_scalar!(
        r#"SELECT MAX(date) AS "max?: String" FROM events WHERE club_id = ?"#,
        club_id
    )
    .fetch_one(&app.pool)
    .await?;
    Ok(max.as_deref().and_then(parse_date))
}

/// `get_events_this_month` + `average_attendance`: returns `"New!"` when there
/// are no completed events in the last 28 days, else the mean attendance float.
async fn average_attendance_value(app: &AppState, club_id: i64) -> Result<Value, AppError> {
    let cutoff = (now().date() - Duration::days(28))
        .format(&format_description!("[year]-[month]-[day]"))
        .map_err(|e| AppError::Internal(format!("date format: {e}")))?;
    let counts = sqlx::query_scalar!(
        r#"
        SELECT (SELECT COUNT(*) FROM event_played_one_match p WHERE p.event_id = e.id)
                   AS "count!: i64"
        FROM events e
        WHERE e.club_id = ? AND e.event_complete = 1 AND e.date >= ?
        "#,
        club_id,
        cutoff
    )
    .fetch_all(&app.pool)
    .await?;

    if counts.is_empty() {
        Ok(json!("New!"))
    } else {
        Ok(json!(average_attendance(&counts)))
    }
}

// ===========================================================================
// Response shapes (mirror the Django serializers exactly)
// ===========================================================================

#[derive(Debug, Serialize)]
pub struct SportField {
    name: String,
}

/// `ManyClubSerializer`.
#[derive(Debug, Serialize)]
pub struct ManyClub {
    id: ClubId,
    club_username: String,
    name: String,
    sport_type: Option<SportField>,
    info: Option<String>,
    logo: Option<String>,
    coordinates: Value,
    is_active: bool,
    is_event_upcoming: bool,
    average_attendance: Value,
}

/// `ClubSerializer`.
#[derive(Debug, Serialize)]
pub struct ClubDetail {
    id: ClubId,
    club_username: String,
    name: String,
    sport_type: Option<SportField>,
    president: String,
    info: Option<String>,
    date_created: String,
    logo: Option<String>,
    address: Option<String>,
    coordinates: Value,
    is_club_admin: bool,
    is_club_president: bool,
    membership_status: i64,
    is_active: bool,
    is_event_upcoming: bool,
    average_attendance: Value,
    member_requests: i64,
}

/// `MyClubSerializer`.
#[derive(Debug, Serialize)]
pub struct MyClub {
    id: ClubId,
    name: String,
    logo: Option<String>,
    sport_type: Option<SportField>,
    is_club_admin: bool,
}

/// `MemberRequestDetailSerializer`.
#[derive(Debug, Serialize)]
pub struct MemberRequestDetail {
    id: RequestId,
    club: ClubId,
    user: UserId,
    username: String,
    date_requested: String,
}

/// `MemberBasicSerializer`.
#[derive(Debug, Serialize)]
pub struct MemberBasic {
    id: MemberId,
    first_name: Option<String>,
    surname: Option<String>,
    username: String,
    is_club_admin: bool,
}

/// `MemberEventSerializer`.
#[derive(Debug, Serialize)]
pub struct MemberEvent {
    id: MemberId,
    first_name: Option<String>,
    surname: Option<String>,
    username: String,
    elo: Option<i64>,
}

/// `MemberAttendanceSerializer`.
#[derive(Debug, Serialize)]
pub struct MemberAttendance {
    first_name: Option<String>,
    last_name: Option<String>,
    attendance_count: i64,
}

/// `ClubSocialSerializer`.
#[derive(Debug, Serialize)]
pub struct ClubSocial {
    socials: Value,
}

// ===========================================================================
// Row -> serializer helpers
// ===========================================================================

/// Parse a stored `coordinates` JSON TEXT column to a JSON value (or null).
fn coords_value(raw: Option<String>) -> Value {
    raw.as_deref()
        .and_then(|s| serde_json::from_str::<Value>(s).ok())
        .unwrap_or(Value::Null)
}

/// Build a signed media URL for a stored logo key, mirroring DRF's `use_url`.
fn logo_url(app: &AppState, key: Option<String>) -> Option<String> {
    key.map(|k| {
        app.storage
            .signed_url(&k, crate::media::DEFAULT_URL_TTL_SECS)
    })
}

// ===========================================================================
// Handlers — clubs
// ===========================================================================

#[derive(Deserialize)]
pub struct ClubBounds {
    southwest_lat: Option<f64>,
    southwest_lng: Option<f64>,
    northeast_lat: Option<f64>,
    northeast_lng: Option<f64>,
}

/// Shared list builder for `AllClubView` (with or without a sport filter).
async fn list_clubs(
    app: &AppState,
    sport: Option<&str>,
    bounds: &ClubBounds,
) -> Result<Vec<ManyClub>, AppError> {
    // Intermediate row so both query branches (filtered vs. unfiltered) yield the
    // same concrete type — the `query!` macro mints a distinct struct per call.
    struct ClubListRow {
        id: i64,
        club_username: String,
        name: String,
        info: Option<String>,
        logo: Option<String>,
        coordinates: Option<String>,
        is_active: i64,
        sport_name: Option<String>,
    }

    let rows: Vec<ClubListRow> = if let Some(sport_name) = sport {
        let sport_id = sqlx::query_scalar!("SELECT id FROM sports WHERE name = ?", sport_name)
            .fetch_optional(&app.pool)
            .await?
            .ok_or_else(|| AppError::NotFound("Sport not found".into()))?;
        sqlx::query!(
            r#"SELECT c.id AS "id!: i64", c.club_username, c.name, c.info, c.logo,
                      c.coordinates, c.is_active AS "is_active!: i64",
                      s.name AS "sport_name?: String"
               FROM clubs c LEFT JOIN sports s ON s.id = c.sport_type_id
               WHERE c.sport_type_id = ? ORDER BY c.id"#,
            sport_id
        )
        .fetch_all(&app.pool)
        .await?
        .into_iter()
        .map(|r| ClubListRow {
            id: r.id,
            club_username: r.club_username,
            name: r.name,
            info: r.info,
            logo: r.logo,
            coordinates: r.coordinates,
            is_active: r.is_active,
            sport_name: r.sport_name,
        })
        .collect()
    } else {
        sqlx::query!(
            r#"SELECT c.id AS "id!: i64", c.club_username, c.name, c.info, c.logo,
                      c.coordinates, c.is_active AS "is_active!: i64",
                      s.name AS "sport_name?: String"
               FROM clubs c LEFT JOIN sports s ON s.id = c.sport_type_id
               ORDER BY c.id"#
        )
        .fetch_all(&app.pool)
        .await?
        .into_iter()
        .map(|r| ClubListRow {
            id: r.id,
            club_username: r.club_username,
            name: r.name,
            info: r.info,
            logo: r.logo,
            coordinates: r.coordinates,
            is_active: r.is_active,
            sport_name: r.sport_name,
        })
        .collect()
    };

    let bounded = bounds.southwest_lat.is_some()
        && bounds.southwest_lng.is_some()
        && bounds.northeast_lat.is_some()
        && bounds.northeast_lng.is_some();

    let mut out = Vec::new();
    for r in rows {
        let coords = coords_value(r.coordinates);
        if bounded {
            // Only include clubs whose coordinates fall inside the viewport.
            let (Some(lat), Some(lng)) = (
                coords.get("lat").and_then(Value::as_f64),
                coords.get("lng").and_then(Value::as_f64),
            ) else {
                continue;
            };
            if !(bounds.southwest_lat.unwrap_or(f64::MIN) <= lat
                && lat <= bounds.northeast_lat.unwrap_or(f64::MAX)
                && bounds.southwest_lng.unwrap_or(f64::MIN) <= lng
                && lng <= bounds.northeast_lng.unwrap_or(f64::MAX))
            {
                continue;
            }
        }
        let upcoming = is_event_upcoming(recent_event_date(app, r.id).await?, now().date());
        let avg = average_attendance_value(app, r.id).await?;
        out.push(ManyClub {
            id: r.id.into(),
            club_username: r.club_username,
            name: r.name,
            sport_type: r.sport_name.map(|name| SportField { name }),
            info: r.info,
            logo: logo_url(app, r.logo),
            coordinates: coords,
            is_active: r.is_active != 0,
            is_event_upcoming: upcoming,
            average_attendance: avg,
        });
    }
    Ok(out)
}

/// GET /api/clubs/ — every club (optionally filtered to a viewport).
pub async fn all_clubs(
    State(app): State<AppState>,
    _user: AuthUser,
    Query(bounds): Query<ClubBounds>,
) -> Result<Json<Vec<ManyClub>>, AppError> {
    Ok(Json(list_clubs(&app, None, &bounds).await?))
}

/// GET /api/clubs/:sport — clubs for one sport.
pub async fn clubs_by_sport(
    State(app): State<AppState>,
    _user: AuthUser,
    Path(sport): Path<String>,
    Query(bounds): Query<ClubBounds>,
) -> Result<Json<Vec<ManyClub>>, AppError> {
    Ok(Json(list_clubs(&app, Some(&sport), &bounds).await?))
}

/// GET /api/club/:pk — full club detail in the requesting user's context.
pub async fn club_detail(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
) -> Result<Json<ClubDetail>, AppError> {
    let pk = pk.inner();
    let r = sqlx::query!(
        r#"SELECT c.id AS "id!: i64", c.club_username, c.name, c.info, c.logo,
                  c.address, c.coordinates, c.date_created,
                  c.is_active AS "is_active!: i64",
                  c.president_id AS "president_id!: i64",
                  s.name AS "sport_name?: String",
                  u.username AS "president_username!: String"
           FROM clubs c
           LEFT JOIN sports s ON s.id = c.sport_type_id
           JOIN users u ON u.id = c.president_id
           WHERE c.id = ?"#,
        pk
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No ClubModel matches the given query.".into()))?;

    let member = is_member(&app, user.id, pk).await?;
    let admin = is_admin(&app, user.id, pk).await?;
    let has_request = sqlx::query_scalar!(
        r#"SELECT 1 AS "x!: i64" FROM member_requests WHERE club_id = ? AND user_id = ? LIMIT 1"#,
        pk,
        user.id
    )
    .fetch_optional(&app.pool)
    .await?
    .is_some();
    let req_count =
        sqlx::query_scalar!("SELECT COUNT(*) FROM member_requests WHERE club_id = ?", pk)
            .fetch_one(&app.pool)
            .await?;
    let upcoming = is_event_upcoming(recent_event_date(&app, pk).await?, now().date());
    let avg = average_attendance_value(&app, pk).await?;

    Ok(Json(ClubDetail {
        id: r.id.into(),
        club_username: r.club_username,
        name: r.name,
        sport_type: r.sport_name.map(|name| SportField { name }),
        president: r.president_username,
        info: r.info,
        date_created: r.date_created,
        logo: logo_url(&app, r.logo),
        address: r.address,
        coordinates: coords_value(r.coordinates),
        is_club_admin: admin,
        is_club_president: r.president_id == user.id,
        membership_status: membership_status(member, has_request),
        is_active: r.is_active != 0,
        is_event_upcoming: upcoming,
        average_attendance: avg,
        member_requests: req_count,
    }))
}

/// DELETE /api/club/:pk — delete a club (legacy: any authenticated user).
pub async fn delete_club(
    State(app): State<AppState>,
    _user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
) -> Result<StatusCode, AppError> {
    let pk = pk.inner();
    sqlx::query!("DELETE FROM clubs WHERE id = ?", pk)
        .execute(&app.pool)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
pub struct CreateClubRequest {
    club_username: Option<String>,
    name: Option<String>,
    info: Option<String>,
}

/// POST /api/createclub/ — create a club and make the user president + admin.
pub async fn create_club(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreateClubRequest>,
) -> Result<(StatusCode, Json<ClubDetail>), AppError> {
    let club_username = req.club_username.unwrap_or_default();
    let name = req.name.unwrap_or_default();
    let info = req.info.unwrap_or_default();
    validate_create_club(&club_username, &name, &info)?;

    // Username must not collide with a user or another club (legacy check).
    let taken = sqlx::query_scalar!(
        r#"SELECT 1 AS "x!: i64" FROM users WHERE username = ?
         UNION ALL SELECT 1 FROM clubs WHERE club_username = ? LIMIT 1"#,
        club_username,
        club_username
    )
    .fetch_optional(&app.pool)
    .await?
    .is_some();
    if taken {
        return Err(AppError::Validation("Club username already exists.".into()));
    }

    let date_created = fmt_ts(now())?;
    let date_joined = date_created.clone();
    let club_id = sqlx::query_scalar!(
        r#"INSERT INTO clubs (club_username, name, president_id, info, date_created, is_active, socials)
           VALUES (?, ?, ?, ?, ?, 1, '[]') RETURNING id AS "id!: i64""#,
        club_username,
        name,
        user.id,
        info,
        date_created
    )
    .fetch_one(&app.pool)
    .await?;
    sqlx::query!(
        "INSERT INTO members (club_id, user_id, is_member, is_admin, date_joined)
         VALUES (?, ?, 1, 1, ?)",
        club_id,
        user.id,
        date_joined
    )
    .execute(&app.pool)
    .await?;

    let detail = club_detail(State(app), user, ApiPath(ClubId::from_raw(club_id))).await?;
    Ok((StatusCode::CREATED, detail))
}

#[derive(Deserialize)]
pub struct EditClubRequest {
    name: Option<String>,
    info: Option<String>,
}

/// PATCH /api/club/edit/:pk — admin-only partial edit of name/info.
pub async fn edit_club(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
    Json(req): Json<EditClubRequest>,
) -> Result<Json<ClubDetail>, AppError> {
    let pk = pk.inner();
    require_admin(&app, user.id, pk).await?;
    if let Some(name) = &req.name {
        sqlx::query!("UPDATE clubs SET name = ? WHERE id = ?", name, pk)
            .execute(&app.pool)
            .await?;
    }
    if let Some(info) = &req.info {
        sqlx::query!("UPDATE clubs SET info = ? WHERE id = ?", info, pk)
            .execute(&app.pool)
            .await?;
    }
    club_detail(State(app), user, ApiPath(ClubId::from_raw(pk))).await
}

/// GET /api/club/my-clubs — clubs the user belongs to (`MyClubSerializer`).
pub async fn my_clubs(
    State(app): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<MyClub>>, AppError> {
    let rows = sqlx::query!(
        r#"SELECT c.id AS "id!: i64", c.name, c.logo, s.name AS "sport_name?: String",
                  m.is_admin AS "is_admin!: i64"
           FROM members m
           JOIN clubs c ON c.id = m.club_id
           LEFT JOIN sports s ON s.id = c.sport_type_id
           WHERE m.user_id = ?
           ORDER BY m.id"#,
        user.id
    )
    .fetch_all(&app.pool)
    .await?;
    let out = rows
        .into_iter()
        .map(|r| MyClub {
            id: r.id.into(),
            name: r.name,
            logo: logo_url(&app, r.logo),
            sport_type: r.sport_name.map(|name| SportField { name }),
            is_club_admin: r.is_admin != 0,
        })
        .collect();
    Ok(Json(out))
}

// ===========================================================================
// Handlers — members & requests
// ===========================================================================

/// GET /api/club/requests/:pk — pending requests for a club (admin only).
pub async fn club_requests(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
) -> Result<Json<Vec<MemberRequestDetail>>, AppError> {
    let pk = pk.inner();
    require_admin(&app, user.id, pk).await?;
    let rows = sqlx::query!(
        r#"SELECT mr.id AS "id!: i64", mr.club_id AS "club!: i64",
                  mr.user_id AS "user!: i64", mr.date_requested,
                  u.username AS "username!: String"
           FROM member_requests mr JOIN users u ON u.id = mr.user_id
           WHERE mr.club_id = ? ORDER BY mr.id"#,
        pk
    )
    .fetch_all(&app.pool)
    .await?;
    let out = rows
        .into_iter()
        .map(|r| MemberRequestDetail {
            id: r.id.into(),
            club: r.club.into(),
            user: r.user.into(),
            username: r.username,
            date_requested: r.date_requested,
        })
        .collect();
    Ok(Json(out))
}

/// GET /api/club/members/:pk — a club's members (admin only).
pub async fn club_members(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
) -> Result<Json<Vec<MemberBasic>>, AppError> {
    let pk = pk.inner();
    require_admin(&app, user.id, pk).await?;
    let rows = sqlx::query!(
        r#"SELECT m.id AS "id!: i64", m.is_admin AS "is_admin!: i64",
                  u.first_name, u.surname, u.username AS "username!: String"
           FROM members m JOIN users u ON u.id = m.user_id
           WHERE m.club_id = ? ORDER BY m.id"#,
        pk
    )
    .fetch_all(&app.pool)
    .await?;
    let out = rows
        .into_iter()
        .map(|r| MemberBasic {
            id: r.id.into(),
            first_name: r.first_name,
            surname: r.surname,
            username: r.username,
            is_club_admin: r.is_admin != 0,
        })
        .collect();
    Ok(Json(out))
}

/// GET /api/club/members/event/:pk1 — a club's members with the event's
/// game-type ELO attached (admin only).
pub async fn club_members_event(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk1): ApiPath<EventId>,
) -> Result<Json<Vec<MemberEvent>>, AppError> {
    let pk1 = pk1.inner();
    let event = sqlx::query!(
        r#"SELECT club_id AS "club_id!: i64", game_type_id AS "game_type_id?: i64"
           FROM events WHERE id = ?"#,
        pk1
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No Event matches the given query.".into()))?;

    require_admin(&app, user.id, event.club_id).await?;

    let rows = sqlx::query!(
        r#"SELECT m.id AS "id!: i64", m.user_id AS "user_id!: i64",
                  u.first_name, u.surname, u.username AS "username!: String"
           FROM members m JOIN users u ON u.id = m.user_id
           WHERE m.club_id = ? ORDER BY m.id"#,
        event.club_id
    )
    .fetch_all(&app.pool)
    .await?;

    let mut out = Vec::new();
    for r in rows {
        let elo = match event.game_type_id {
            Some(gt) => {
                sqlx::query_scalar!(
                    r#"SELECT e.elo AS "elo!: i64" FROM user_elos ue
                   JOIN elo e ON e.id = ue.elo_id
                   WHERE ue.user_id = ? AND e.game_type_id = ? LIMIT 1"#,
                    r.user_id,
                    gt
                )
                .fetch_optional(&app.pool)
                .await?
            }
            None => None,
        };
        out.push(MemberEvent {
            id: r.id.into(),
            first_name: r.first_name,
            surname: r.surname,
            username: r.username,
            elo,
        });
    }
    Ok(Json(out))
}

#[derive(Deserialize)]
pub struct MemberRequestCreate {
    club: ClubId,
}

/// POST /api/club/request/create/ — request to join a club.
pub async fn create_request(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<MemberRequestCreate>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    // 404 if the club is missing (legacy get_object_or_404).
    let club_id = req.club.inner();
    club_president(&app, club_id).await?;
    if is_member(&app, user.id, club_id).await? {
        return Err(AppError::Validation(
            "You are already a member of this club.".into(),
        ));
    }
    let date_requested = fmt_ts(now())?;
    sqlx::query!(
        "INSERT INTO member_requests (club_id, user_id, date_requested) VALUES (?, ?, ?)",
        club_id,
        user.id,
        date_requested
    )
    .execute(&app.pool)
    .await?;
    Ok((StatusCode::CREATED, Json(json!({ "club": req.club }))))
}

#[derive(Deserialize)]
pub struct MemberRequestCancel {
    club: Option<ClubId>,
}

/// POST /api/club/request/cancel/ — withdraw your own pending request.
pub async fn cancel_request(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<MemberRequestCancel>,
) -> Result<StatusCode, AppError> {
    let Some(club) = req.club else {
        return Err(AppError::Validation("Missing club or user data".into()));
    };
    let club = club.inner();
    let deleted = sqlx::query!(
        "DELETE FROM member_requests WHERE club_id = ? AND user_id = ?",
        club,
        user.id
    )
    .execute(&app.pool)
    .await?;
    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound("Member request not found".into()));
    }
    Ok(StatusCode::NO_CONTENT)
}

/// Accept a member request: reactivate a past membership or create a new one.
/// Port of `services.accept_member_request`.
async fn accept_member_request(app: &AppState, request_id: i64) -> Result<(), AppError> {
    let req = sqlx::query!(
        r#"SELECT club_id AS "club_id!: i64", user_id AS "user_id!: i64"
           FROM member_requests WHERE id = ?"#,
        request_id
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No MemberRequest matches the given query.".into()))?;

    let existing = sqlx::query_scalar!(
        r#"SELECT id AS "id!: i64" FROM members WHERE club_id = ? AND user_id = ? LIMIT 1"#,
        req.club_id,
        req.user_id
    )
    .fetch_optional(&app.pool)
    .await?;

    if let Some(member_id) = existing {
        sqlx::query!("UPDATE members SET is_member = 1 WHERE id = ?", member_id)
            .execute(&app.pool)
            .await?;
    } else {
        let date_joined = fmt_ts(now())?;
        sqlx::query!(
            "INSERT INTO members (club_id, user_id, is_member, is_admin, date_joined)
             VALUES (?, ?, 1, 0, ?)",
            req.club_id,
            req.user_id,
            date_joined
        )
        .execute(&app.pool)
        .await?;
    }
    sqlx::query!("DELETE FROM member_requests WHERE id = ?", request_id)
        .execute(&app.pool)
        .await?;
    Ok(())
}

/// GET /api/club/request-accept/:pk2/:pk — accept request `pk2` (admin of `pk`).
pub async fn accept_request(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath((pk2, pk)): ApiPath<(RequestId, ClubId)>,
) -> Result<StatusCode, AppError> {
    let (pk2, pk) = (pk2.inner(), pk.inner());
    require_admin(&app, user.id, pk).await?;
    accept_member_request(&app, pk2).await?;
    Ok(StatusCode::CREATED)
}

/// DELETE /api/club/request-accept/:pk2/:pk — reject request `pk2` (admin of `pk`).
pub async fn reject_request(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath((pk2, pk)): ApiPath<(RequestId, ClubId)>,
) -> Result<StatusCode, AppError> {
    let (pk2, pk) = (pk2.inner(), pk.inner());
    require_admin(&app, user.id, pk).await?;
    let deleted = sqlx::query!("DELETE FROM member_requests WHERE id = ?", pk2)
        .execute(&app.pool)
        .await?;
    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound(
            "No MemberRequest matches the given query.".into(),
        ));
    }
    Ok(StatusCode::NO_CONTENT)
}

/// Remove a member, porting `services.remove_member`'s permission + cleanup
/// rules. `requesting_user` is the actor performing the removal.
async fn remove_member(
    app: &AppState,
    member_id: i64,
    requesting_user: i64,
) -> Result<(), AppError> {
    let m = sqlx::query!(
        r#"SELECT m.id AS "id!: i64", m.club_id AS "club_id!: i64",
                  m.user_id AS "user_id!: i64", m.is_admin AS "is_admin!: i64",
                  c.president_id AS "president_id!: i64",
                  u.is_active AS "is_active!: i64", u.username AS "username!: String"
           FROM members m
           JOIN clubs c ON c.id = m.club_id
           JOIN users u ON u.id = m.user_id
           WHERE m.id = ?"#,
        member_id
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No Member matches the given query.".into()))?;

    if m.president_id == m.user_id {
        return Err(AppError::Forbidden(
            "A president cannot be revoked of their membership.".into(),
        ));
    }

    let mut clear_admin = false;
    if m.is_admin != 0 {
        if m.president_id != requesting_user {
            return Err(AppError::Forbidden(
                "Only the club president can delete an admin.".into(),
            ));
        }
        clear_admin = true;
    }

    // Dummy-user cleanup: inactive `dummyuser_<id>` accounts are hard-deleted.
    if m.is_active == 0 {
        if let Some(rest) = m.username.strip_prefix("dummyuser_") {
            if let Ok(dummy_id) = rest.parse::<i64>() {
                sqlx::query!("DELETE FROM dummy_users WHERE id = ?", dummy_id)
                    .execute(&app.pool)
                    .await?;
                // Deleting the user cascades the membership + club_bots row.
                sqlx::query!("DELETE FROM users WHERE id = ?", m.user_id)
                    .execute(&app.pool)
                    .await?;
                return Ok(());
            }
        }
    }

    let new_admin: i64 = if clear_admin { 0 } else { m.is_admin };
    sqlx::query!(
        "UPDATE members SET is_member = 0, is_admin = ? WHERE id = ?",
        new_admin,
        member_id
    )
    .execute(&app.pool)
    .await?;
    Ok(())
}

/// DELETE /api/club/member/:pk2/:pk — remove member `pk2` (admin of club `pk`).
pub async fn delete_member(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath((pk2, pk)): ApiPath<(MemberId, ClubId)>,
) -> Result<StatusCode, AppError> {
    let (pk2, pk) = (pk2.inner(), pk.inner());
    require_admin(&app, user.id, pk).await?;
    remove_member(&app, pk2, user.id).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// DELETE /api/club/member/:pk — leave the club `pk` yourself.
pub async fn leave_club(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
) -> Result<StatusCode, AppError> {
    let pk = pk.inner();
    require_admin(&app, user.id, pk).await?;
    let member_id = sqlx::query_scalar!(
        r#"SELECT id AS "id!: i64" FROM members WHERE club_id = ? AND user_id = ? LIMIT 1"#,
        pk,
        user.id
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No Member matches the given query.".into()))?;
    remove_member(&app, member_id, user.id).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
pub struct CreateDummyUser {
    first_name: String,
    surname: String,
    #[serde(default = "default_gender")]
    biological_gender: String,
}

fn default_gender() -> String {
    "male".to_string()
}

/// POST /api/club/dummy-user/create/:pk — create a placeholder member (admin).
pub async fn create_dummy_user(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
    Json(req): Json<CreateDummyUser>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    let pk = pk.inner();
    require_admin(&app, user.id, pk).await?;
    if !matches!(req.biological_gender.as_str(), "male" | "female") {
        return Err(AppError::Validation(
            "biological_gender must be 'male' or 'female'.".into(),
        ));
    }

    let club_username = sqlx::query_scalar!("SELECT club_username FROM clubs WHERE id = ?", pk)
        .fetch_one(&app.pool)
        .await?;

    let dummy_id = sqlx::query_scalar!(
        r#"INSERT INTO dummy_users (first_name, surname, biological_gender, club_id)
           VALUES (?, ?, ?, ?) RETURNING id AS "id!: i64""#,
        req.first_name,
        req.surname,
        req.biological_gender,
        pk
    )
    .fetch_one(&app.pool)
    .await?;

    // Mirror DummyUser.create_member: an inactive backing user + a membership.
    let username = format!("dummyuser_{dummy_id}");
    let email = format!(
        "{}.{}_{}@{}.com",
        req.first_name.to_lowercase(),
        req.surname.to_lowercase(),
        dummy_id,
        club_username
    );
    let password_hash = format!("!unusable:{}", random_suffix());
    let date_joined = fmt_ts(now())?;
    let new_user_id = sqlx::query_scalar!(
        r#"INSERT INTO users
            (username, email, first_name, surname, biological_gender, password_hash,
             date_joined, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0) RETURNING id AS "id!: i64""#,
        username,
        email,
        req.first_name,
        req.surname,
        req.biological_gender,
        password_hash,
        date_joined
    )
    .fetch_one(&app.pool)
    .await?;
    sqlx::query!(
        "INSERT INTO members (club_id, user_id, is_member, is_admin, date_joined)
         VALUES (?, ?, 1, 0, ?)",
        pk,
        new_user_id,
        date_joined
    )
    .execute(&app.pool)
    .await?;
    sqlx::query!(
        "INSERT INTO club_bots (club_id, user_id) VALUES (?, ?)",
        pk,
        new_user_id
    )
    .execute(&app.pool)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "first_name": req.first_name,
            "surname": req.surname,
            "biological_gender": req.biological_gender,
        })),
    ))
}

/// GET /api/club/make-admin/:pk2/:pk — promote member `pk2` (president of `pk`).
pub async fn promote_member(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath((pk2, pk)): ApiPath<(MemberId, ClubId)>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    let (pk2, pk) = (pk2.inner(), pk.inner());
    require_president(&app, user.id, pk).await?;
    let is_adm = sqlx::query_scalar!(
        r#"SELECT is_admin AS "is_admin!: i64" FROM members WHERE id = ?"#,
        pk2
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No Member matches the given query.".into()))?;
    if is_adm != 0 {
        return Err(AppError::Validation(
            "This user is already a club admin.".into(),
        ));
    }
    sqlx::query!("UPDATE members SET is_admin = 1 WHERE id = ?", pk2)
        .execute(&app.pool)
        .await?;
    Ok((
        StatusCode::CREATED,
        Json(json!({ "message": "User made a club admin successfully." })),
    ))
}

/// DELETE /api/club/make-admin/:pk2/:pk — demote member `pk2` (president of `pk`).
pub async fn demote_member(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath((pk2, pk)): ApiPath<(MemberId, ClubId)>,
) -> Result<StatusCode, AppError> {
    let (pk2, pk) = (pk2.inner(), pk.inner());
    require_president(&app, user.id, pk).await?;
    let is_adm = sqlx::query_scalar!(
        r#"SELECT is_admin AS "is_admin!: i64" FROM members WHERE id = ?"#,
        pk2
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("No Member matches the given query.".into()))?;
    if is_adm == 0 {
        return Err(AppError::Validation(
            "This user is not a club admin.".into(),
        ));
    }
    sqlx::query!("UPDATE members SET is_admin = 0 WHERE id = ?", pk2)
        .execute(&app.pool)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

// ===========================================================================
// Handlers — attendance
// ===========================================================================

#[derive(Deserialize)]
pub struct AttendanceRequest {
    start_date: Option<String>,
    finish_date: Option<String>,
    club_id: Option<ClubId>,
}

/// POST /api/member-attendance/ — per-member attendance over a date range.
pub async fn member_attendance(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<AttendanceRequest>,
) -> Result<Json<Vec<MemberAttendance>>, AppError> {
    let (Some(start), Some(finish), Some(club_id)) = (req.start_date, req.finish_date, req.club_id)
    else {
        return Err(AppError::Validation("Missing required parameters".into()));
    };
    let club_id = club_id.inner();
    require_admin(&app, user.id, club_id).await?;

    let rows = sqlx::query!(
        r#"SELECT m.id AS "id!: i64", u.first_name, u.surname,
                  COUNT(*) AS "attendance_count!: i64"
           FROM event_played_one_match p
           JOIN events e ON e.id = p.event_id
           JOIN members m ON m.id = p.member_id
           JOIN users u ON u.id = m.user_id
           WHERE e.club_id = ? AND e.date >= ? AND e.date <= ?
           GROUP BY m.id
           ORDER BY u.surname"#,
        club_id,
        start,
        finish
    )
    .fetch_all(&app.pool)
    .await?;
    let out = rows
        .into_iter()
        .map(|r| MemberAttendance {
            first_name: r.first_name,
            last_name: r.surname,
            attendance_count: r.attendance_count,
        })
        .collect();
    Ok(Json(out))
}

// ===========================================================================
// Handlers — sports
// ===========================================================================

/// GET /api/club/add-sport — list every sport (names only).
pub async fn list_sports(State(app): State<AppState>) -> Result<Json<Vec<SportField>>, AppError> {
    let rows = sqlx::query!(r#"SELECT name FROM sports ORDER BY id"#)
        .fetch_all(&app.pool)
        .await?;
    Ok(Json(
        rows.into_iter()
            .map(|r| SportField { name: r.name })
            .collect(),
    ))
}

#[derive(Deserialize)]
pub struct AddSportRequest {
    sport_name: Option<String>,
    club_id: Option<ClubId>,
}

/// POST /api/club/add-sport — set a club's sport type.
pub async fn add_sport(
    State(app): State<AppState>,
    _user: AuthUser,
    Json(req): Json<AddSportRequest>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    let (Some(sport_name), Some(club_id)) = (req.sport_name, req.club_id) else {
        return Err(AppError::Validation(
            "Sport name and club ID are required.".into(),
        ));
    };
    let club_id = club_id.inner();
    let club_exists =
        sqlx::query_scalar!(r#"SELECT 1 AS "x!: i64" FROM clubs WHERE id = ?"#, club_id)
            .fetch_optional(&app.pool)
            .await?
            .is_some();
    if !club_exists {
        return Err(AppError::NotFound("Club not found.".into()));
    }
    let sport_id = sqlx::query_scalar!("SELECT id FROM sports WHERE name = ?", sport_name)
        .fetch_optional(&app.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Sport not found.".into()))?;
    sqlx::query!(
        "UPDATE clubs SET sport_type_id = ? WHERE id = ?",
        sport_id,
        club_id
    )
    .execute(&app.pool)
    .await?;
    Ok((
        StatusCode::CREATED,
        Json(json!({ "message": "Sport added to club successfully." })),
    ))
}

// ===========================================================================
// Handlers — socials
// ===========================================================================

/// GET /api/clubs/:pk/socials — a club's social links (`ClubSocialSerializer`).
pub async fn club_socials(
    State(app): State<AppState>,
    ApiPath(pk): ApiPath<ClubId>,
) -> Result<Json<ClubSocial>, AppError> {
    let pk = pk.inner();
    let raw = sqlx::query_scalar!("SELECT socials FROM clubs WHERE id = ?", pk)
        .fetch_optional(&app.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("No ClubModel matches the given query.".into()))?;
    let socials = serde_json::from_str::<Value>(&raw).unwrap_or_else(|_| json!([]));
    Ok(Json(ClubSocial { socials }))
}

#[derive(Deserialize)]
pub struct UpdateSocialsRequest {
    facebook: Option<String>,
    instagram: Option<String>,
    whatsapp: Option<String>,
    website: Option<String>,
}

/// POST /api/club/edit/socials/:pk — set/clear the four supported social links.
pub async fn update_socials(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
    Json(req): Json<UpdateSocialsRequest>,
) -> Result<Json<Value>, AppError> {
    let pk = pk.inner();
    require_admin(&app, user.id, pk).await?;
    let raw = sqlx::query_scalar!("SELECT socials FROM clubs WHERE id = ?", pk)
        .fetch_one(&app.pool)
        .await?;
    let mut socials: Vec<Value> = serde_json::from_str(&raw).unwrap_or_default();

    let inputs = [
        ("facebook", req.facebook),
        ("instagram", req.instagram),
        ("whatsapp", req.whatsapp),
        ("website", req.website),
    ];
    for (platform, value) in inputs {
        // Always drop any existing entry for this platform first.
        socials.retain(|s| s.get("platform").and_then(Value::as_str) != Some(platform));
        if let Some(v) = value.filter(|v| !v.is_empty()) {
            match check_valid(&v, platform) {
                Some(url) => socials.push(json!({ "platform": platform, "url": url })),
                None => {
                    return Err(AppError::Validation(format!("{platform} link is invalid")));
                }
            }
        }
    }

    let serialized = serde_json::to_string(&socials)
        .map_err(|e| AppError::Internal(format!("socials serialize: {e}")))?;
    sqlx::query!("UPDATE clubs SET socials = ? WHERE id = ?", serialized, pk)
        .execute(&app.pool)
        .await?;
    Ok(Json(
        json!({ "detail": "Social links successfully updated" }),
    ))
}

// ===========================================================================
// Handlers — logo (media) & address (geocode)
// ===========================================================================

/// PATCH /api/club/:pk/logo — upload a club logo (admin only, multipart).
pub async fn upload_logo(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
    mut multipart: Multipart,
) -> Result<Json<Value>, AppError> {
    let pk = pk.inner();
    require_admin(&app, user.id, pk).await?;

    let mut upload: Option<(String, Vec<u8>)> = None;
    while let Some(f) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::Validation(format!("Invalid upload: {e}")))?
    {
        if f.name() == Some("logo") {
            let content_type = f.content_type().map(|c| c.to_string()).unwrap_or_default();
            let bytes = f
                .bytes()
                .await
                .map_err(|e| AppError::Validation(format!("Invalid upload: {e}")))?;
            upload = Some((content_type, bytes.to_vec()));
            break;
        }
    }
    let (content_type, bytes) =
        upload.ok_or_else(|| AppError::Validation("No logo file provided.".into()))?;
    let ext = validate_image(&content_type, bytes.len())?;

    let key = format!("club_logos/{pk}.{ext}");
    app.storage.put(&key, &bytes, &content_type).await?;
    sqlx::query!("UPDATE clubs SET logo = ? WHERE id = ?", key, pk)
        .execute(&app.pool)
        .await?;

    Ok(Json(json!({ "message": "Club logo updated successfully" })))
}

/// DELETE /api/club/:pk/logo — remove a club logo (admin only).
pub async fn remove_logo(
    State(app): State<AppState>,
    user: AuthUser,
    ApiPath(pk): ApiPath<ClubId>,
) -> Result<Json<Value>, AppError> {
    let pk = pk.inner();
    require_admin(&app, user.id, pk).await?;

    let row = sqlx::query!("SELECT logo FROM clubs WHERE id = ?", pk)
        .fetch_optional(&app.pool)
        .await?;
    if let Some(key) = row.and_then(|r| r.logo) {
        app.storage.delete(&key).await?;
    }
    sqlx::query!("UPDATE clubs SET logo = NULL WHERE id = ?", pk)
        .execute(&app.pool)
        .await?;

    Ok(Json(json!({ "message": "Club logo removed successfully" })))
}

#[derive(Deserialize)]
pub struct AddressRequest {
    address: Option<String>,
    club_id: Option<ClubId>,
}

/// POST /api/club/add-address — geocode + store an address (admin only).
pub async fn add_address(
    State(app): State<AppState>,
    user: AuthUser,
    Json(req): Json<AddressRequest>,
) -> Result<Json<Value>, AppError> {
    let (Some(address), Some(club_id)) = (req.address.clone(), req.club_id) else {
        return Err(AppError::Validation("Address is required".into()));
    };
    let club_id = club_id.inner();
    require_admin(&app, user.id, club_id).await?;

    let loc = app.geocoder.geocode(&address).await?;
    let lat_lng = json!({ "lat": loc.lat, "lng": loc.lng });
    let coords = serde_json::to_string(&lat_lng)
        .map_err(|e| AppError::Internal(format!("coords serialize: {e}")))?;
    sqlx::query!(
        "UPDATE clubs SET coordinates = ?, address = ? WHERE id = ?",
        coords,
        loc.formatted_address,
        club_id
    )
    .execute(&app.pool)
    .await?;

    Ok(Json(json!({
        "lat_lng": lat_lng,
        "address": address,
        "formatted_address": loc.formatted_address,
    })))
}

#[cfg(test)]
mod tests {
    use super::*;
    use time::macros::date;

    #[test]
    fn average_attendance_matches_django() {
        assert_eq!(average_attendance(&[]), 0.0);
        assert_eq!(average_attendance(&[2, 4]), 3.0);
        assert_eq!(average_attendance(&[1, 2, 2]), 5.0 / 3.0);
    }

    #[test]
    fn membership_status_levels() {
        assert_eq!(membership_status(true, true), 2);
        assert_eq!(membership_status(true, false), 2);
        assert_eq!(membership_status(false, true), 1);
        assert_eq!(membership_status(false, false), 0);
    }

    #[test]
    fn event_upcoming_window() {
        let today = date!(2026 - 06 - 02);
        assert!(!is_event_upcoming(None, today));
        // A future event is upcoming.
        assert!(is_event_upcoming(Some(date!(2026 - 07 - 01)), today));
        // Today's event is still upcoming (date + 1 day == tomorrow, not < today).
        assert!(is_event_upcoming(Some(today), today));
        // Yesterday's event: yesterday + 1 == today, not < today -> still upcoming.
        assert!(is_event_upcoming(Some(date!(2026 - 06 - 01)), today));
        // Two days ago: date + 1 < today -> not upcoming.
        assert!(!is_event_upcoming(Some(date!(2026 - 05 - 31)), today));
    }

    #[test]
    fn create_club_validation_messages() {
        assert!(validate_create_club("", "n", "i").is_err());
        assert!(validate_create_club(&"a".repeat(13), "n", "i").is_err());
        assert!(validate_create_club("club", "", "i").is_err());
        assert!(validate_create_club("club", &"n".repeat(51), "i").is_err());
        // An empty description is allowed; it is an optional field.
        assert!(validate_create_club("club", "n", "").is_ok());
        assert!(validate_create_club("club", "n", &"i".repeat(161)).is_err());
        assert!(validate_create_club("club", "Name", "Info").is_ok());
    }

    #[test]
    fn standardize_and_check_social_urls() {
        // Bare www. is prefixed with http://.
        assert_eq!(
            standardize_url("www.facebook.com/club").as_deref(),
            Some("http://www.facebook.com/club")
        );
        // A host without www. gets one added.
        assert_eq!(
            standardize_url("http://facebook.com").as_deref(),
            Some("http://www.facebook.com")
        );
        // facebook link validates against the facebook.com host rule.
        assert_eq!(
            check_valid("www.facebook.com/club", "facebook").as_deref(),
            Some("http://www.facebook.com/club")
        );
        // wrong platform host -> invalid.
        assert!(check_valid("www.facebook.com/club", "instagram").is_none());
        // whatsapp requires the chat.whatsapp host.
        assert!(check_valid("www.whatsapp.com", "whatsapp").is_none());
        assert!(check_valid("https://chat.whatsapp.com/abc", "whatsapp").is_some());
        // website accepts any valid URL.
        assert!(check_valid("www.myclub.org", "website").is_some());
    }
}
