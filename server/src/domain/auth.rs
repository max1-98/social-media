//! Auth: register / login / logout / refresh, email verification, password reset,
//! age gate, and consent logging.
//!
//! Replaces django-oauth-toolkit + social-auth with in-house argon2 hashing and
//! an OAuth2-style password grant: opaque access + refresh tokens stored in the
//! `tokens` table, carried in httpOnly cookies, and lazy-expired on read.
//! Ports: `backend/authorization/`, `backend/accounts/` (auth-related views).

use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::SaltString;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use axum::extract::{FromRef, FromRequestParts, State};
use axum::http::request::Parts;
use axum::http::HeaderMap;
use axum::{Json, RequestPartsExt};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use rand::distributions::Alphanumeric;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use time::format_description::well_known::Rfc3339;
use time::macros::format_description;
use time::{Date, Duration, OffsetDateTime};

use crate::email;
use crate::error::AppError;
use crate::state::AppState;

const ACCESS_COOKIE: &str = "access_token";
const REFRESH_COOKIE: &str = "refresh_token";

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested below)
// ---------------------------------------------------------------------------

/// Hash a password with argon2id (default params).
fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| AppError::Internal(format!("hash error: {e}")))
}

/// Verify a password against a stored argon2 hash.
fn verify_password(hash: &str, password: &str) -> bool {
    match PasswordHash::new(hash) {
        Ok(parsed) => Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok(),
        Err(_) => false,
    }
}

/// Validate + normalise a username, mirroring the legacy manager:
/// lowercased, 4–30 chars, `[a-z0-9_]` only.
fn normalize_username(raw: &str) -> Result<String, AppError> {
    let username = raw.trim().to_lowercase();
    let ok = (4..=30).contains(&username.chars().count())
        && username
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_');
    if ok {
        Ok(username)
    } else {
        Err(AppError::Validation(
            "Username must be 4–30 characters: letters, numbers, underscores.".into(),
        ))
    }
}

/// Basic password policy mirroring Django's default validators we keep:
/// minimum length 8 and not entirely numeric.
fn validate_password(password: &str) -> Result<(), AppError> {
    if password.chars().count() < 8 {
        return Err(AppError::Validation(
            "Password must be at least 8 characters.".into(),
        ));
    }
    if password.chars().all(|c| c.is_ascii_digit()) {
        return Err(AppError::Validation(
            "Password cannot be entirely numeric.".into(),
        ));
    }
    Ok(())
}

/// Parse a `YYYY-MM-DD` date of birth.
fn parse_dob(s: &str) -> Result<Date, AppError> {
    let fmt = format_description!("[year]-[month]-[day]");
    Date::parse(s.trim(), &fmt)
        .map_err(|_| AppError::Validation("date_of_birth must be YYYY-MM-DD.".into()))
}

/// Completed years between `dob` and `today`.
fn age_on(dob: Date, today: Date) -> i32 {
    let mut age = today.year() - dob.year();
    if (today.month() as u8, today.day()) < (dob.month() as u8, dob.day()) {
        age -= 1;
    }
    age
}

/// Generate an opaque alphanumeric token of `len` chars.
fn random_token(len: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(len)
        .map(char::from)
        .collect()
}

fn now() -> OffsetDateTime {
    OffsetDateTime::now_utc()
}

fn fmt_ts(t: OffsetDateTime) -> Result<String, AppError> {
    t.format(&Rfc3339)
        .map_err(|e| AppError::Internal(format!("time format: {e}")))
}

fn parse_ts(s: &str) -> Result<OffsetDateTime, AppError> {
    OffsetDateTime::parse(s, &Rfc3339).map_err(|e| AppError::Internal(format!("time parse: {e}")))
}

/// Whether `creation_time` (RFC3339) plus `ttl` is in the past.
fn is_expired(creation_time: &str, ttl: std::time::Duration) -> Result<bool, AppError> {
    let created = parse_ts(creation_time)?;
    Ok(created + Duration::seconds(ttl.as_secs() as i64) <= now())
}

// ---------------------------------------------------------------------------
// Request / response shapes
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub first_name: Option<String>,
    pub surname: Option<String>,
    pub date_of_birth: String,
    #[serde(default = "default_gender")]
    pub biological_gender: String,
}

fn default_gender() -> String {
    "male".to_string()
}

#[derive(Serialize)]
pub struct UserProfile {
    pub id: i64,
    pub username: String,
    pub email: Option<String>,
    pub first_name: Option<String>,
    pub surname: Option<String>,
    pub date_of_birth: Option<String>,
    pub biological_gender: String,
    pub email_verified: bool,
    pub parental_consent_required: bool,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct EmailRequest {
    pub email: String,
}

#[derive(Deserialize)]
pub struct VerifyRequest {
    pub email_token: String,
}

#[derive(Deserialize)]
pub struct ResetRequest {
    pub password1: String,
    pub password2: String,
    pub password_token: String,
}

#[derive(Deserialize)]
pub struct ConsentRequest {
    pub consent_type: String,
    pub choice: String,
}

// ---------------------------------------------------------------------------
// Authenticated-user extractor (cookie -> tokens -> user, with lazy expiry)
// ---------------------------------------------------------------------------

/// The identity behind a valid `access_token` cookie.
pub struct AuthUser {
    pub id: i64,
}

#[axum::async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app = AppState::from_ref(state);
        let jar: CookieJar = parts
            .extract()
            .await
            .map_err(|_| AppError::Unauthorized("Not authenticated.".into()))?;
        let token = jar
            .get(ACCESS_COOKIE)
            .map(|c| c.value().to_string())
            .ok_or_else(|| AppError::Unauthorized("Not authenticated.".into()))?;

        let row = sqlx::query!(
            "SELECT user_id, access_expires_at FROM tokens WHERE access_token = ?",
            token
        )
        .fetch_optional(&app.pool)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Invalid session.".into()))?;

        // Lazy expiry: drop the row and reject if the access token has expired.
        if parse_ts(&row.access_expires_at)? <= now() {
            sqlx::query!("DELETE FROM tokens WHERE access_token = ?", token)
                .execute(&app.pool)
                .await?;
            return Err(AppError::Unauthorized("Session expired.".into()));
        }

        Ok(AuthUser { id: row.user_id })
    }
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

fn session_cookie(
    name: &'static str,
    value: String,
    ttl: std::time::Duration,
    secure: bool,
) -> Cookie<'static> {
    Cookie::build((name, value))
        .http_only(true)
        .secure(secure)
        .same_site(SameSite::Lax)
        .path("/")
        .max_age(Duration::seconds(ttl.as_secs() as i64))
        .build()
}

fn clearing_cookie(name: &'static str) -> Cookie<'static> {
    Cookie::build((name, String::new()))
        .http_only(true)
        .path("/")
        .max_age(Duration::seconds(0))
        .build()
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// POST /api/auth/register — create an account, age-gate it, send a verify email.
pub async fn register(
    State(app): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Result<(axum::http::StatusCode, Json<UserProfile>), AppError> {
    let username = normalize_username(&req.username)?;
    let email = req.email.trim().to_lowercase();
    if email.is_empty() || !email.contains('@') {
        return Err(AppError::Validation("A valid email is required.".into()));
    }
    validate_password(&req.password)?;
    let dob = parse_dob(&req.date_of_birth)?;
    if !matches!(req.biological_gender.as_str(), "male" | "female") {
        return Err(AppError::Validation(
            "biological_gender must be 'male' or 'female'.".into(),
        ));
    }

    // Age gate: under the digital-consent age, the account is created but inactive
    // and flagged until parental consent is granted (GDPR minors handling).
    let age = age_on(dob, now().date());
    let parental_required = age < app.config.digital_consent_age as i32;
    let is_active: i64 = if parental_required { 0 } else { 1 };
    let parental_i: i64 = parental_required.into();

    let password_hash = hash_password(&req.password)?;
    let date_joined = fmt_ts(now())?;
    let dob_str = req.date_of_birth.trim().to_string();

    let id = sqlx::query_scalar!(
        "INSERT INTO users
            (username, email, first_name, surname, date_of_birth, biological_gender,
             password_hash, date_joined, is_active, parental_consent_required)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id",
        username,
        email,
        req.first_name,
        req.surname,
        dob_str,
        req.biological_gender,
        password_hash,
        date_joined,
        is_active,
        parental_i,
    )
    .fetch_one(&app.pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(ref db) if db.is_unique_violation() => {
            AppError::Conflict("That username or email is already taken.".into())
        }
        other => AppError::from(other),
    })?;

    // Issue an email-verification token and send the link (no-op without a key).
    let token = random_token(32);
    let creation_time = fmt_ts(now())?;
    sqlx::query!(
        "INSERT INTO email_verify (user_id, token, creation_time) VALUES (?, ?, ?)",
        id,
        token,
        creation_time
    )
    .execute(&app.pool)
    .await?;
    email::send_verification(&app.config, &email, &token).await;

    Ok((
        axum::http::StatusCode::CREATED,
        Json(UserProfile {
            id,
            username,
            email: Some(email),
            first_name: req.first_name,
            surname: req.surname,
            date_of_birth: Some(dob_str),
            biological_gender: req.biological_gender,
            email_verified: false,
            parental_consent_required: parental_required,
        }),
    ))
}

/// POST /api/auth/login — verify credentials, mint a session, set cookies.
pub async fn login(
    State(app): State<AppState>,
    jar: CookieJar,
    Json(req): Json<LoginRequest>,
) -> Result<(CookieJar, Json<Value>), AppError> {
    let username = req.username.trim().to_lowercase();
    let user = sqlx::query!(
        "SELECT id AS \"id!\", username, password_hash, is_active,
                parental_consent_required, parental_consent_granted
         FROM users WHERE username = ?",
        username
    )
    .fetch_optional(&app.pool)
    .await?;

    let user = match user {
        Some(u) if verify_password(&u.password_hash, &req.password) => u,
        _ => {
            return Err(AppError::Unauthorized(
                "Unable to authenticate with provided credentials.".into(),
            ))
        }
    };

    if user.is_active == 0 {
        if user.parental_consent_required != 0 && user.parental_consent_granted == 0 {
            return Err(AppError::Forbidden(
                "Parental consent is required before this account can be used.".into(),
            ));
        }
        return Err(AppError::Forbidden("This account is inactive.".into()));
    }

    let jar = issue_session(&app, jar, user.id).await?;
    Ok((
        jar,
        Json(json!({ "user": { "id": user.id, "username": user.username } })),
    ))
}

/// Create a `tokens` row and attach the access + refresh cookies.
async fn issue_session(
    app: &AppState,
    jar: CookieJar,
    user_id: i64,
) -> Result<CookieJar, AppError> {
    let access = random_token(48);
    let refresh = random_token(48);
    let created = now();
    let created_s = fmt_ts(created)?;
    let access_exp =
        fmt_ts(created + Duration::seconds(app.config.access_token_ttl.as_secs() as i64))?;
    let refresh_exp =
        fmt_ts(created + Duration::seconds(app.config.refresh_token_ttl.as_secs() as i64))?;

    sqlx::query!(
        "INSERT INTO tokens
            (user_id, access_token, refresh_token, access_expires_at,
             refresh_expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)",
        user_id,
        access,
        refresh,
        access_exp,
        refresh_exp,
        created_s
    )
    .execute(&app.pool)
    .await?;

    let secure = app.config.cookie_secure;
    let jar = jar
        .add(session_cookie(
            ACCESS_COOKIE,
            access,
            app.config.access_token_ttl,
            secure,
        ))
        .add(session_cookie(
            REFRESH_COOKIE,
            refresh,
            app.config.refresh_token_ttl,
            secure,
        ));
    Ok(jar)
}

/// POST /api/auth/logout — revoke the session and clear cookies.
pub async fn logout(
    State(app): State<AppState>,
    jar: CookieJar,
) -> Result<(CookieJar, Json<Value>), AppError> {
    if let Some(access) = jar.get(ACCESS_COOKIE).map(|c| c.value().to_string()) {
        sqlx::query!("DELETE FROM tokens WHERE access_token = ?", access)
            .execute(&app.pool)
            .await?;
    }
    let jar = jar
        .add(clearing_cookie(ACCESS_COOKIE))
        .add(clearing_cookie(REFRESH_COOKIE));
    Ok((jar, Json(json!({ "detail": "Logged out." }))))
}

/// POST /api/auth/refresh — rotate the access token from a valid refresh cookie.
pub async fn refresh(
    State(app): State<AppState>,
    jar: CookieJar,
) -> Result<(CookieJar, Json<Value>), AppError> {
    let refresh = jar
        .get(REFRESH_COOKIE)
        .map(|c| c.value().to_string())
        .ok_or_else(|| AppError::Unauthorized("No refresh token.".into()))?;

    let row = sqlx::query!(
        "SELECT t.id AS id, t.user_id AS user_id, t.refresh_expires_at AS refresh_expires_at,
                u.username AS username
         FROM tokens t JOIN users u ON u.id = t.user_id
         WHERE t.refresh_token = ?",
        refresh
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::Unauthorized("Invalid refresh token.".into()))?;

    // Lazy expiry of the refresh token.
    if parse_ts(&row.refresh_expires_at)? <= now() {
        sqlx::query!("DELETE FROM tokens WHERE id = ?", row.id)
            .execute(&app.pool)
            .await?;
        return Err(AppError::Unauthorized("Refresh token expired.".into()));
    }

    let new_access = random_token(48);
    let new_access_exp =
        fmt_ts(now() + Duration::seconds(app.config.access_token_ttl.as_secs() as i64))?;
    sqlx::query!(
        "UPDATE tokens SET access_token = ?, access_expires_at = ? WHERE id = ?",
        new_access,
        new_access_exp,
        row.id
    )
    .execute(&app.pool)
    .await?;

    let jar = jar.add(session_cookie(
        ACCESS_COOKIE,
        new_access,
        app.config.access_token_ttl,
        app.config.cookie_secure,
    ));
    Ok((
        jar,
        Json(json!({ "user": { "id": row.user_id, "username": row.username } })),
    ))
}

/// POST /api/auth/request-verify — (re)send an email-verification link.
/// Always 200 so the response can't be used to probe which emails exist.
pub async fn request_verify(
    State(app): State<AppState>,
    Json(req): Json<EmailRequest>,
) -> Result<Json<Value>, AppError> {
    let email = req.email.trim().to_lowercase();
    if let Some(rec) = sqlx::query!("SELECT id, email FROM users WHERE email = ?", email)
        .fetch_optional(&app.pool)
        .await?
    {
        let token = random_token(32);
        let creation_time = fmt_ts(now())?;
        sqlx::query!(
            "INSERT INTO email_verify (user_id, token, creation_time) VALUES (?, ?, ?)",
            rec.id,
            token,
            creation_time
        )
        .execute(&app.pool)
        .await?;
        if let Some(to) = rec.email {
            email::send_verification(&app.config, &to, &token).await;
        }
    }
    Ok(Json(
        json!({ "detail": "If that email exists, a link has been sent." }),
    ))
}

/// POST /api/auth/verify-email — consume a verification token.
pub async fn verify_email(
    State(app): State<AppState>,
    Json(req): Json<VerifyRequest>,
) -> Result<Json<Value>, AppError> {
    let rec = sqlx::query!(
        "SELECT id, user_id, creation_time FROM email_verify WHERE token = ?",
        req.email_token
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::Validation("Invalid or expired token.".into()))?;

    if is_expired(&rec.creation_time, app.config.short_token_ttl)? {
        sqlx::query!("DELETE FROM email_verify WHERE id = ?", rec.id)
            .execute(&app.pool)
            .await?;
        return Err(AppError::Validation("Invalid or expired token.".into()));
    }

    sqlx::query!(
        "UPDATE users SET email_verified = 1 WHERE id = ?",
        rec.user_id
    )
    .execute(&app.pool)
    .await?;
    sqlx::query!("DELETE FROM email_verify WHERE id = ?", rec.id)
        .execute(&app.pool)
        .await?;

    Ok(Json(json!({ "detail": "Email successfully verified." })))
}

/// POST /api/auth/request-reset — send a password-reset link (always 200).
pub async fn request_reset(
    State(app): State<AppState>,
    Json(req): Json<EmailRequest>,
) -> Result<Json<Value>, AppError> {
    let email = req.email.trim().to_lowercase();
    if let Some(rec) = sqlx::query!("SELECT id, email FROM users WHERE email = ?", email)
        .fetch_optional(&app.pool)
        .await?
    {
        let token = random_token(32);
        let creation_time = fmt_ts(now())?;
        sqlx::query!(
            "INSERT INTO password_reset (user_id, token, creation_time) VALUES (?, ?, ?)",
            rec.id,
            token,
            creation_time
        )
        .execute(&app.pool)
        .await?;
        if let Some(to) = rec.email {
            email::send_password_reset(&app.config, &to, &token).await;
        }
    }
    Ok(Json(
        json!({ "detail": "If that email exists, a reset link has been sent." }),
    ))
}

/// POST /api/auth/reset-password — set a new password from a reset token.
pub async fn reset_password(
    State(app): State<AppState>,
    Json(req): Json<ResetRequest>,
) -> Result<Json<Value>, AppError> {
    if req.password1 != req.password2 {
        return Err(AppError::Validation("Passwords do not match.".into()));
    }
    validate_password(&req.password1)?;

    let rec = sqlx::query!(
        "SELECT id, user_id, creation_time FROM password_reset WHERE token = ?",
        req.password_token
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::Validation("Invalid or expired token.".into()))?;

    if is_expired(&rec.creation_time, app.config.short_token_ttl)? {
        sqlx::query!("DELETE FROM password_reset WHERE id = ?", rec.id)
            .execute(&app.pool)
            .await?;
        return Err(AppError::Validation("Invalid or expired token.".into()));
    }

    let hash = hash_password(&req.password1)?;
    sqlx::query!(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        hash,
        rec.user_id
    )
    .execute(&app.pool)
    .await?;
    sqlx::query!("DELETE FROM password_reset WHERE id = ?", rec.id)
        .execute(&app.pool)
        .await?;
    // Revoke any existing sessions for safety.
    sqlx::query!("DELETE FROM tokens WHERE user_id = ?", rec.user_id)
        .execute(&app.pool)
        .await?;

    Ok(Json(json!({ "detail": "Password successfully updated." })))
}

/// POST /api/auth/consent — record a GDPR consent choice. Works pre- and
/// post-login (anonymous CMP choices keep a null `user_id`).
pub async fn consent(
    State(app): State<AppState>,
    jar: CookieJar,
    headers: HeaderMap,
    Json(req): Json<ConsentRequest>,
) -> Result<Json<Value>, AppError> {
    if !matches!(req.choice.as_str(), "accept" | "reject") {
        return Err(AppError::Validation(
            "choice must be 'accept' or 'reject'.".into(),
        ));
    }

    // Best-effort: associate with the logged-in user if a valid access cookie is
    // present, otherwise log anonymously.
    let user_id: Option<i64> = match jar.get(ACCESS_COOKIE).map(|c| c.value().to_string()) {
        Some(tok) => {
            sqlx::query_scalar!("SELECT user_id FROM tokens WHERE access_token = ?", tok)
                .fetch_optional(&app.pool)
                .await?
        }
        None => None,
    };

    let ip = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .map(|v| v.split(',').next().unwrap_or(v).trim().to_string());
    let ua = headers
        .get(axum::http::header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.to_string());
    let created = fmt_ts(now())?;

    sqlx::query!(
        "INSERT INTO consent_log
            (user_id, consent_type, choice, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?)",
        user_id,
        req.consent_type,
        req.choice,
        ip,
        ua,
        created
    )
    .execute(&app.pool)
    .await?;

    Ok(Json(json!({ "detail": "Consent recorded." })))
}

/// GET /api/auth/me — the authenticated user's profile.
pub async fn me(
    State(app): State<AppState>,
    user: AuthUser,
) -> Result<Json<UserProfile>, AppError> {
    let row = sqlx::query!(
        "SELECT id, username, email, first_name, surname, date_of_birth,
                biological_gender, email_verified, parental_consent_required
         FROM users WHERE id = ?",
        user.id
    )
    .fetch_optional(&app.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found.".into()))?;

    Ok(Json(UserProfile {
        id: row.id,
        username: row.username,
        email: row.email,
        first_name: row.first_name,
        surname: row.surname,
        date_of_birth: row.date_of_birth,
        biological_gender: row.biological_gender,
        email_verified: row.email_verified != 0,
        parental_consent_required: row.parental_consent_required != 0,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use time::macros::date;

    #[test]
    fn password_hash_roundtrip() {
        let hash = hash_password("hunter2pass").unwrap();
        assert!(verify_password(&hash, "hunter2pass"));
        assert!(!verify_password(&hash, "wrong"));
    }

    #[test]
    fn username_rules() {
        assert_eq!(normalize_username("Max_198").unwrap(), "max_198");
        assert!(normalize_username("ab").is_err()); // too short
        assert!(normalize_username("has space").is_err());
        assert!(normalize_username("bad!char").is_err());
    }

    #[test]
    fn password_policy() {
        assert!(validate_password("short").is_err());
        assert!(validate_password("12345678").is_err()); // all numeric
        assert!(validate_password("goodpass1").is_ok());
    }

    #[test]
    fn age_calculation() {
        let today = date!(2026 - 06 - 02);
        assert_eq!(age_on(date!(2002 - 07 - 11), today), 23); // birthday not yet reached
        assert_eq!(age_on(date!(2002 - 06 - 02), today), 24); // birthday today
        assert_eq!(age_on(date!(2012 - 01 - 01), today), 14); // a minor
    }

    #[test]
    fn dob_parsing() {
        assert!(parse_dob("2002-07-11").is_ok());
        assert!(parse_dob("not-a-date").is_err());
    }
}
