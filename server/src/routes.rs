//! HTTP routing.
//!
//! The single binary serves three things: the JSON API under `/api`, the static
//! SPA build (`web/dist`) at the root, and (later) a media proxy. Real files are
//! served by `ServeDir`; any other non-API path falls back to `index.html` with
//! a 200 so client-side routing works.

use axum::handler::HandlerWithoutStateExt;
use axum::http::StatusCode;
use axum::response::{Html, IntoResponse, Response};
use axum::{
    routing::{get, post},
    Json, Router,
};
use serde_json::{json, Value};
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;

use crate::domain::{auth, elo};
use crate::state::AppState;

/// Directory the frontend is built into (`web/dist`). Overridable for deploys.
fn web_dist_dir() -> String {
    std::env::var("WEB_DIST_DIR").unwrap_or_else(|_| "web/dist".to_string())
}

pub fn router(state: AppState) -> Router {
    // In-house auth: register/login/logout/refresh, email-verify, password-reset,
    // and GDPR consent logging. Mirrors backend/authorization + backend/accounts.
    let auth = Router::new()
        .route("/register", post(auth::register))
        .route("/login", post(auth::login))
        .route("/logout", post(auth::logout))
        .route("/refresh", post(auth::refresh))
        .route("/request-verify", post(auth::request_verify))
        .route("/verify-email", post(auth::verify_email))
        .route("/request-reset", post(auth::request_reset))
        .route("/reset-password", post(auth::reset_password))
        .route("/consent", post(auth::consent))
        .route("/me", get(auth::me));

    // ELO: a user's rating rows. Mirrors backend/elo (EloListView).
    let elo = Router::new().route("/elos/:username", get(elo::list_for_user));

    let api = Router::new()
        .route("/health", get(health))
        .route("/hello", get(hello))
        .nest("/auth", auth)
        .nest("/elo", elo);

    // Real files (JS/CSS/assets) are served by ServeDir; anything it can't find
    // falls back to the SPA shell so deep links / client routes resolve. If the
    // build is absent (backend-only dev) the fallback 404s but the API still
    // works.
    // `.fallback` (not `.not_found_service`, which would force a 404) lets the
    // SPA shell respond with its own 200 status.
    let static_files = ServeDir::new(web_dist_dir()).fallback(spa_fallback.into_service());

    Router::new()
        .nest("/api", api)
        .fallback_service(static_files)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

/// SPA fallback: serve `index.html` with a 200 so the client router takes over.
async fn spa_fallback() -> Response {
    let index = format!("{}/index.html", web_dist_dir());
    match tokio::fs::read_to_string(&index).await {
        Ok(html) => Html(html).into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "not found").into_response(),
    }
}

/// Liveness/readiness probe.
async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

/// Phase 1 sanity endpoint — proves the binary is wired end to end.
async fn hello() -> Json<Value> {
    Json(json!({ "message": "hello from the lightweight Rust backend" }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Config;
    use crate::db::test_support::test_pool;
    use axum::body::{to_bytes, Body};
    use axum::http::{header, Request};
    use sqlx::SqlitePool;
    use tower::ServiceExt; // for `oneshot`

    /// Build an app backed by a fresh in-memory DB with cookies non-`Secure` so
    /// the test client can read them back over plain HTTP. Returns the pool too so
    /// tests can inspect rows (e.g. read a verification token the email no-op'd).
    async fn test_app() -> (Router, SqlitePool) {
        let pool = test_pool().await;
        let mut config = Config::from_env();
        config.cookie_secure = false;
        config.resend_api_key = None; // never hit the network in tests
        let app = router(AppState::new(pool.clone(), config));
        (app, pool)
    }

    async fn body_json(res: Response) -> Value {
        let bytes = to_bytes(res.into_body(), usize::MAX).await.unwrap();
        serde_json::from_slice(&bytes).unwrap()
    }

    fn post(uri: &str, json: Value) -> Request<Body> {
        Request::builder()
            .method("POST")
            .uri(uri)
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(json.to_string()))
            .unwrap()
    }

    /// Collect `set-cookie` name=value pairs into a single `Cookie` header value.
    fn cookies_from(res: &Response) -> String {
        res.headers()
            .get_all(header::SET_COOKIE)
            .iter()
            .filter_map(|v| v.to_str().ok())
            .filter_map(|c| c.split(';').next())
            .collect::<Vec<_>>()
            .join("; ")
    }

    fn register_body(username: &str, email: &str, dob: &str) -> Value {
        json!({
            "username": username,
            "email": email,
            "password": "123ThisPasswordRocks!",
            "first_name": "Max",
            "surname": "Smith",
            "date_of_birth": dob,
            "biological_gender": "male"
        })
    }

    #[tokio::test]
    async fn health_returns_ok() {
        let (app, _pool) = test_app().await;
        let res = app
            .oneshot(
                Request::builder()
                    .uri("/api/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        assert_eq!(body_json(res).await["status"], "ok");
    }

    #[tokio::test]
    async fn register_returns_parity_shape() {
        let (app, _pool) = test_app().await;
        let res = app
            .oneshot(post(
                "/api/auth/register",
                register_body("max198", "max@example.com", "2002-07-11"),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
        let body = body_json(res).await;
        assert_eq!(body["username"], "max198");
        assert_eq!(body["email"], "max@example.com");
        assert_eq!(body["biological_gender"], "male");
        assert_eq!(body["email_verified"], false);
        assert_eq!(body["parental_consent_required"], false);
        // Password must never be echoed back.
        assert!(body.get("password").is_none());
    }

    #[tokio::test]
    async fn duplicate_username_conflicts() {
        let (app, _pool) = test_app().await;
        let ok = app
            .clone()
            .oneshot(post(
                "/api/auth/register",
                register_body("dupe_user", "a@example.com", "2000-01-01"),
            ))
            .await
            .unwrap();
        assert_eq!(ok.status(), StatusCode::CREATED);
        let conflict = app
            .oneshot(post(
                "/api/auth/register",
                register_body("dupe_user", "b@example.com", "2000-01-01"),
            ))
            .await
            .unwrap();
        assert_eq!(conflict.status(), StatusCode::CONFLICT);
    }

    #[tokio::test]
    async fn minor_is_flagged_for_parental_consent() {
        let (app, _pool) = test_app().await;
        let res = app
            .clone()
            .oneshot(post(
                "/api/auth/register",
                register_body("young_one", "kid@example.com", "2015-01-01"),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
        assert_eq!(body_json(res).await["parental_consent_required"], true);

        // A flagged (inactive) minor account cannot log in yet.
        let login = app
            .oneshot(post(
                "/api/auth/login",
                json!({ "username": "young_one", "password": "123ThisPasswordRocks!" }),
            ))
            .await
            .unwrap();
        assert_eq!(login.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn wrong_password_is_unauthorized() {
        let (app, _pool) = test_app().await;
        app.clone()
            .oneshot(post(
                "/api/auth/register",
                register_body("loginuser", "l@example.com", "2000-01-01"),
            ))
            .await
            .unwrap();
        let res = app
            .oneshot(post(
                "/api/auth/login",
                json!({ "username": "loginuser", "password": "nope-wrong-pass" }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn full_login_me_refresh_logout_flow() {
        let (app, _pool) = test_app().await;
        app.clone()
            .oneshot(post(
                "/api/auth/register",
                register_body("flowuser", "flow@example.com", "1999-03-03"),
            ))
            .await
            .unwrap();

        // /me without a session is rejected.
        let unauth = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/auth/me")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(unauth.status(), StatusCode::UNAUTHORIZED);

        // Login sets cookies.
        let login = app
            .clone()
            .oneshot(post(
                "/api/auth/login",
                json!({ "username": "flowuser", "password": "123ThisPasswordRocks!" }),
            ))
            .await
            .unwrap();
        assert_eq!(login.status(), StatusCode::OK);
        let cookies = cookies_from(&login);
        assert!(cookies.contains("access_token="));
        assert!(cookies.contains("refresh_token="));

        // /me with cookies returns the profile.
        let me = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/auth/me")
                    .header(header::COOKIE, &cookies)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(me.status(), StatusCode::OK);
        assert_eq!(body_json(me).await["username"], "flowuser");

        // Refresh rotates the access token.
        let refresh = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/auth/refresh")
                    .header(header::COOKIE, &cookies)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(refresh.status(), StatusCode::OK);

        // Logout revokes the session; /me is rejected afterwards.
        let logout = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/auth/logout")
                    .header(header::COOKIE, &cookies)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(logout.status(), StatusCode::OK);

        let after = app
            .oneshot(
                Request::builder()
                    .uri("/api/auth/me")
                    .header(header::COOKIE, &cookies)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(after.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn email_verification_flow() {
        let (app, pool) = test_app().await;
        app.clone()
            .oneshot(post(
                "/api/auth/register",
                register_body("verifyme", "verify@example.com", "1990-05-05"),
            ))
            .await
            .unwrap();

        // The email is a no-op in tests, so read the token straight from the DB.
        let token: String = sqlx::query_scalar("SELECT token FROM email_verify LIMIT 1")
            .fetch_one(&pool)
            .await
            .unwrap();

        let res = app
            .oneshot(post(
                "/api/auth/verify-email",
                json!({ "email_token": token }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        assert_eq!(
            body_json(res).await["detail"],
            "Email successfully verified."
        );

        let verified: i64 = sqlx::query_scalar("SELECT email_verified FROM users WHERE id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(verified, 1);
    }

    #[tokio::test]
    async fn password_reset_flow() {
        let (app, pool) = test_app().await;
        app.clone()
            .oneshot(post(
                "/api/auth/register",
                register_body("resetme", "reset@example.com", "1990-05-05"),
            ))
            .await
            .unwrap();

        // Request a reset, then read the token the email no-op'd.
        let req = app
            .clone()
            .oneshot(post(
                "/api/auth/request-reset",
                json!({ "email": "reset@example.com" }),
            ))
            .await
            .unwrap();
        assert_eq!(req.status(), StatusCode::OK);
        let token: String = sqlx::query_scalar("SELECT token FROM password_reset LIMIT 1")
            .fetch_one(&pool)
            .await
            .unwrap();

        let res = app
            .clone()
            .oneshot(post(
                "/api/auth/reset-password",
                json!({
                    "password1": "BrandNewPass1",
                    "password2": "BrandNewPass1",
                    "password_token": token
                }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        // The new password now works.
        let login = app
            .oneshot(post(
                "/api/auth/login",
                json!({ "username": "resetme", "password": "BrandNewPass1" }),
            ))
            .await
            .unwrap();
        assert_eq!(login.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn consent_is_logged() {
        let (app, pool) = test_app().await;
        let res = app
            .oneshot(post(
                "/api/auth/consent",
                json!({ "consent_type": "ads", "choice": "accept" }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let row: (String, String) =
            sqlx::query_as("SELECT consent_type, choice FROM consent_log LIMIT 1")
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(row, ("ads".to_string(), "accept".to_string()));
    }

    #[tokio::test]
    async fn elo_list_returns_parity_shape() {
        let (app, pool) = test_app().await;
        // Register + log in so the protected route accepts the request.
        app.clone()
            .oneshot(post(
                "/api/auth/register",
                register_body("elouser", "elo@example.com", "1995-01-01"),
            ))
            .await
            .unwrap();
        let login = app
            .clone()
            .oneshot(post(
                "/api/auth/login",
                json!({ "username": "elouser", "password": "123ThisPasswordRocks!" }),
            ))
            .await
            .unwrap();
        let cookies = cookies_from(&login);

        // Seed a badminton-singles (game_type 1) rating row linked to user 1.
        let elo_id: i64 = sqlx::query_scalar(
            "INSERT INTO elo (game_type_id, elo, last_game, winstreak, best_winstreak)
             VALUES (1, 1120, '2026-05-01', 2, 5) RETURNING id",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        sqlx::query("INSERT INTO user_elos (user_id, elo_id) VALUES (1, ?)")
            .bind(elo_id)
            .execute(&pool)
            .await
            .unwrap();

        let res = app
            .oneshot(
                Request::builder()
                    .uri("/api/elo/elos/elouser")
                    .header(header::COOKIE, &cookies)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = body_json(res).await;
        let row = &body[0];
        assert_eq!(row["game_type"], "badminton singles");
        assert_eq!(row["style"], "singles");
        assert_eq!(row["sport"], "badminton");
        assert_eq!(row["elo"], 1120);
        assert_eq!(row["winstreak"], 2);
        assert_eq!(row["best_winstreak"], 5);
        assert_eq!(row["last_game"], "2026-05-01");
        assert_eq!(row["wins"], 0);
        assert_eq!(row["total_games"], 0);
        assert_eq!(row["winrate"], 1);
    }
}
