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
    routing::{delete, get, patch, post},
    Json, Router,
};
use serde_json::{json, Value};
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;

use crate::domain::{auth, clubs, elo};
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

    // Clubs: mirrors backend/clubs/urls.py. These paths sit directly under /api
    // (no club app-prefix), so they're merged rather than nested. A single path
    // can serve two verbs (e.g. request-accept is GET=accept, DELETE=reject).
    let clubs = Router::new()
        // Club reads + lifecycle.
        .route("/clubs", get(clubs::all_clubs))
        .route("/clubs/:sport", get(clubs::clubs_by_sport))
        .route("/club/my-clubs", get(clubs::my_clubs))
        .route(
            "/club/:pk",
            get(clubs::club_detail).delete(clubs::delete_club),
        )
        .route("/createclub", post(clubs::create_club))
        .route("/club/edit/:pk", patch(clubs::edit_club))
        // Member requests + membership.
        .route("/club/request/create", post(clubs::create_request))
        .route("/club/request/cancel", post(clubs::cancel_request))
        .route("/club/requests/:pk", get(clubs::club_requests))
        .route("/club/members/:pk", get(clubs::club_members))
        .route("/club/members/event/:pk1", get(clubs::club_members_event))
        .route(
            "/club/request-accept/:pk2/:pk",
            get(clubs::accept_request).delete(clubs::reject_request),
        )
        .route("/club/member/:pk2/:pk", delete(clubs::delete_member))
        .route("/club/member/:pk", delete(clubs::leave_club))
        .route(
            "/club/dummy-user/create/:pk",
            post(clubs::create_dummy_user),
        )
        .route(
            "/club/make-admin/:pk2/:pk",
            get(clubs::promote_member).delete(clubs::demote_member),
        )
        .route("/member-attendance", post(clubs::member_attendance))
        // Sports, socials, media, geocode.
        .route(
            "/club/add-sport",
            get(clubs::list_sports).post(clubs::add_sport),
        )
        .route("/clubs/:pk/socials", get(clubs::club_socials))
        .route("/club/edit/socials/:pk", post(clubs::update_socials))
        .route("/club/:pk/logo", patch(clubs::upload_logo))
        .route("/club/add-address", post(clubs::add_address));

    let api = Router::new()
        .route("/health", get(health))
        .route("/hello", get(hello))
        .nest("/auth", auth)
        .nest("/elo", elo)
        .merge(clubs);

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
    use crate::geocode::test_support::MockGeocoder;
    use crate::geocode::GeoLocation;
    use crate::media::LocalDiskStorage;
    use axum::body::{to_bytes, Body};
    use axum::http::{header, Request};
    use sqlx::SqlitePool;
    use std::sync::Arc;
    use tower::ServiceExt; // for `oneshot`

    /// Build an app backed by a fresh in-memory DB with cookies non-`Secure` so
    /// the test client can read them back over plain HTTP. Returns the pool too so
    /// tests can inspect rows (e.g. read a verification token the email no-op'd).
    ///
    /// Media uses `LocalDiskStorage` in a unique temp dir and the geocoder is a
    /// `MockGeocoder` — no network is ever touched in tests.
    async fn test_app() -> (Router, SqlitePool) {
        test_app_with_geocode(GeoLocation {
            lat: 51.5,
            lng: -0.12,
            formatted_address: "10 Downing St, London, UK".into(),
        })
        .await
    }

    /// Like `test_app` but with a configurable canned geocode result.
    async fn test_app_with_geocode(location: GeoLocation) -> (Router, SqlitePool) {
        let pool = test_pool().await;
        let mut config = Config::from_env();
        config.cookie_secure = false;
        config.resend_api_key = None; // never hit the network in tests
        let dir = std::env::temp_dir().join(format!(
            "clubs-media-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        let storage = Arc::new(LocalDiskStorage::new(
            dir,
            "/media",
            b"test-secret".to_vec(),
        ));
        let geocoder = Arc::new(MockGeocoder { location });
        let app = router(AppState::new(pool.clone(), config, storage, geocoder));
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

    // -----------------------------------------------------------------------
    // Clubs domain
    // -----------------------------------------------------------------------

    /// Register a user and log in, returning the cookie header for follow-ups.
    async fn register_and_login(app: &Router, username: &str) -> String {
        app.clone()
            .oneshot(post(
                "/api/auth/register",
                register_body(username, &format!("{username}@example.com"), "1995-01-01"),
            ))
            .await
            .unwrap();
        let login = app
            .clone()
            .oneshot(post(
                "/api/auth/login",
                json!({ "username": username, "password": "123ThisPasswordRocks!" }),
            ))
            .await
            .unwrap();
        cookies_from(&login)
    }

    fn get_with(uri: &str, cookies: &str) -> Request<Body> {
        Request::builder()
            .uri(uri)
            .header(header::COOKIE, cookies)
            .body(Body::empty())
            .unwrap()
    }

    fn json_with(method: &str, uri: &str, cookies: &str, body: Value) -> Request<Body> {
        Request::builder()
            .method(method)
            .uri(uri)
            .header(header::COOKIE, cookies)
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(body.to_string()))
            .unwrap()
    }

    fn delete_with(uri: &str, cookies: &str) -> Request<Body> {
        Request::builder()
            .method("DELETE")
            .uri(uri)
            .header(header::COOKIE, cookies)
            .body(Body::empty())
            .unwrap()
    }

    /// Create a club via the API and return its id.
    async fn create_test_club(app: &Router, cookies: &str, username: &str, name: &str) -> i64 {
        let res = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/createclub",
                cookies,
                json!({ "club_username": username, "name": name, "info": "A club" }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
        body_json(res).await["id"].as_i64().unwrap()
    }

    #[tokio::test]
    async fn create_club_returns_parity_shape() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "prez").await;
        let res = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/createclub",
                &cookies,
                json!({ "club_username": "smashers", "name": "Smashers", "info": "Hello" }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
        let body = body_json(res).await;
        assert_eq!(body["club_username"], "smashers");
        assert_eq!(body["name"], "Smashers");
        assert_eq!(body["president"], "prez");
        // Creator is president + admin + member (status 2), no pending requests.
        assert_eq!(body["is_club_admin"], true);
        assert_eq!(body["is_club_president"], true);
        assert_eq!(body["membership_status"], 2);
        assert_eq!(body["member_requests"], 0);
        // No events yet -> not upcoming, "New!" attendance.
        assert_eq!(body["is_event_upcoming"], false);
        assert_eq!(body["average_attendance"], "New!");
        assert_eq!(body["sport_type"], Value::Null);
    }

    #[tokio::test]
    async fn create_club_rejects_long_username() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "prez2").await;
        let res = app
            .oneshot(json_with(
                "POST",
                "/api/createclub",
                &cookies,
                json!({ "club_username": "thisistoolong", "name": "X", "info": "Y" }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn list_clubs_and_by_sport() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "lister").await;
        let club_id = create_test_club(&app, &cookies, "tennaces", "Tennis Aces").await;
        // Attach the badminton sport (id 1) directly.
        sqlx::query("UPDATE clubs SET sport_type_id = 1 WHERE id = ?")
            .bind(club_id)
            .execute(&pool)
            .await
            .unwrap();

        let all = app
            .clone()
            .oneshot(get_with("/api/clubs", &cookies))
            .await
            .unwrap();
        assert_eq!(all.status(), StatusCode::OK);
        assert_eq!(body_json(all).await.as_array().unwrap().len(), 1);

        let by_sport = app
            .clone()
            .oneshot(get_with("/api/clubs/badminton", &cookies))
            .await
            .unwrap();
        assert_eq!(by_sport.status(), StatusCode::OK);
        let body = body_json(by_sport).await;
        assert_eq!(body[0]["sport_type"]["name"], "badminton");

        // Unknown sport -> 404.
        let missing = app
            .oneshot(get_with("/api/clubs/quidditch", &cookies))
            .await
            .unwrap();
        assert_eq!(missing.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn my_clubs_lists_membership() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "owner").await;
        create_test_club(&app, &cookies, "myclub", "My Club").await;
        let res = app
            .oneshot(get_with("/api/club/my-clubs", &cookies))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = body_json(res).await;
        assert_eq!(body.as_array().unwrap().len(), 1);
        assert_eq!(body[0]["name"], "My Club");
    }

    #[tokio::test]
    async fn join_request_accept_and_membership_status() {
        let (app, _pool) = test_app().await;
        let prez = register_and_login(&app, "captain").await;
        let club_id = create_test_club(&app, &prez, "rallyc", "Rally Club").await;
        let joiner = register_and_login(&app, "newbie").await;

        // Newbie requests to join.
        let req = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/club/request/create",
                &joiner,
                json!({ "club": club_id }),
            ))
            .await
            .unwrap();
        assert_eq!(req.status(), StatusCode::CREATED);

        // Newbie now sees membership_status 1 (pending).
        let detail = app
            .clone()
            .oneshot(get_with(&format!("/api/club/{club_id}"), &joiner))
            .await
            .unwrap();
        assert_eq!(body_json(detail).await["membership_status"], 1);

        // President lists requests, grabs the id, accepts it.
        let reqs = app
            .clone()
            .oneshot(get_with(&format!("/api/club/requests/{club_id}"), &prez))
            .await
            .unwrap();
        assert_eq!(reqs.status(), StatusCode::OK);
        let body = body_json(reqs).await;
        let request_id = body[0]["id"].as_i64().unwrap();
        assert_eq!(body[0]["username"], "newbie");

        let accept = app
            .clone()
            .oneshot(get_with(
                &format!("/api/club/request-accept/{request_id}/{club_id}"),
                &prez,
            ))
            .await
            .unwrap();
        assert_eq!(accept.status(), StatusCode::CREATED);

        // Newbie is now a member (status 2).
        let detail = app
            .oneshot(get_with(&format!("/api/club/{club_id}"), &joiner))
            .await
            .unwrap();
        assert_eq!(body_json(detail).await["membership_status"], 2);
    }

    #[tokio::test]
    async fn members_list_requires_admin() {
        let (app, _pool) = test_app().await;
        let prez = register_and_login(&app, "boss").await;
        let club_id = create_test_club(&app, &prez, "elitec", "Elite Club").await;
        let outsider = register_and_login(&app, "stranger").await;

        // Outsider is forbidden from the admin-only member list.
        let forbidden = app
            .clone()
            .oneshot(get_with(&format!("/api/club/members/{club_id}"), &outsider))
            .await
            .unwrap();
        assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

        // President sees themselves as an admin member.
        let ok = app
            .oneshot(get_with(&format!("/api/club/members/{club_id}"), &prez))
            .await
            .unwrap();
        assert_eq!(ok.status(), StatusCode::OK);
        let body = body_json(ok).await;
        assert_eq!(body[0]["username"], "boss");
        assert_eq!(body[0]["is_club_admin"], true);
    }

    #[tokio::test]
    async fn promote_demote_and_president_protections() {
        let (app, pool) = test_app().await;
        let prez = register_and_login(&app, "headhoncho").await;
        let club_id = create_test_club(&app, &prez, "promoc", "Promo Club").await;
        let member = register_and_login(&app, "regular").await;

        // Add the member directly (active, non-admin).
        sqlx::query(
            "INSERT INTO members (club_id, user_id, is_member, is_admin, date_joined)
             SELECT ?, id, 1, 0, '2026-01-01T00:00:00Z' FROM users WHERE username = 'regular'",
        )
        .bind(club_id)
        .execute(&pool)
        .await
        .unwrap();
        let member_id: i64 = sqlx::query_scalar(
            "SELECT m.id FROM members m JOIN users u ON u.id = m.user_id
             WHERE u.username = 'regular'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        // A non-president cannot promote.
        let denied = app
            .clone()
            .oneshot(get_with(
                &format!("/api/club/make-admin/{member_id}/{club_id}"),
                &member,
            ))
            .await
            .unwrap();
        assert_eq!(denied.status(), StatusCode::FORBIDDEN);

        // President promotes, then demotes.
        let promote = app
            .clone()
            .oneshot(get_with(
                &format!("/api/club/make-admin/{member_id}/{club_id}"),
                &prez,
            ))
            .await
            .unwrap();
        assert_eq!(promote.status(), StatusCode::CREATED);
        let demote = app
            .clone()
            .oneshot(delete_with(
                &format!("/api/club/make-admin/{member_id}/{club_id}"),
                &prez,
            ))
            .await
            .unwrap();
        assert_eq!(demote.status(), StatusCode::NO_CONTENT);

        // The president's own membership cannot be removed.
        let prez_member_id: i64 = sqlx::query_scalar(
            "SELECT m.id FROM members m JOIN users u ON u.id = m.user_id
             WHERE u.username = 'headhoncho'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        let protect = app
            .oneshot(delete_with(
                &format!("/api/club/member/{prez_member_id}/{club_id}"),
                &prez,
            ))
            .await
            .unwrap();
        assert_eq!(protect.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn add_sport_and_list_sports() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "sporty").await;
        let club_id = create_test_club(&app, &cookies, "sportc", "Sport Club").await;

        let list = app
            .clone()
            .oneshot(get_with("/api/club/add-sport", &cookies))
            .await
            .unwrap();
        assert_eq!(list.status(), StatusCode::OK);
        assert_eq!(body_json(list).await[0]["name"], "badminton");

        let add = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/club/add-sport",
                &cookies,
                json!({ "sport_name": "tennis", "club_id": club_id }),
            ))
            .await
            .unwrap();
        assert_eq!(add.status(), StatusCode::CREATED);
        let detail = app
            .oneshot(get_with(&format!("/api/club/{club_id}"), &cookies))
            .await
            .unwrap();
        assert_eq!(body_json(detail).await["sport_type"]["name"], "tennis");
    }

    #[tokio::test]
    async fn update_and_read_socials() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "social").await;
        let club_id = create_test_club(&app, &cookies, "socialc", "Social Club").await;

        let update = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/club/edit/socials/{club_id}"),
                &cookies,
                json!({ "facebook": "www.facebook.com/socialclub", "website": "www.socialclub.org" }),
            ))
            .await
            .unwrap();
        assert_eq!(update.status(), StatusCode::OK);

        let read = app
            .oneshot(get_with(&format!("/api/clubs/{club_id}/socials"), &cookies))
            .await
            .unwrap();
        assert_eq!(read.status(), StatusCode::OK);
        let socials = body_json(read).await;
        let arr = socials["socials"].as_array().unwrap();
        assert!(arr.iter().any(
            |s| s["platform"] == "facebook" && s["url"] == "http://www.facebook.com/socialclub"
        ));
        assert!(arr.iter().any(|s| s["platform"] == "website"));
    }

    #[tokio::test]
    async fn invalid_social_link_is_rejected() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "socinv").await;
        let club_id = create_test_club(&app, &cookies, "socinvc", "Soc Inv").await;
        let res = app
            .oneshot(json_with(
                "POST",
                &format!("/api/club/edit/socials/{club_id}"),
                &cookies,
                json!({ "facebook": "www.instagram.com/oops" }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn upload_logo_stores_and_sets_column() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "designer").await;
        let club_id = create_test_club(&app, &cookies, "logoc", "Logo Club").await;

        // Build a minimal multipart body with a PNG part named "logo".
        let boundary = "X-BOUNDARY";
        let body = format!(
            "--{b}\r\nContent-Disposition: form-data; name=\"logo\"; filename=\"l.png\"\r\n\
             Content-Type: image/png\r\n\r\nFAKEPNGDATA\r\n--{b}--\r\n",
            b = boundary
        );
        let req = Request::builder()
            .method("PATCH")
            .uri(format!("/api/club/{club_id}/logo"))
            .header(header::COOKIE, &cookies)
            .header(
                header::CONTENT_TYPE,
                format!("multipart/form-data; boundary={boundary}"),
            )
            .body(Body::from(body))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        assert_eq!(
            body_json(res).await["message"],
            "Club logo updated successfully"
        );
        let logo: String = sqlx::query_scalar("SELECT logo FROM clubs WHERE id = ?")
            .bind(club_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(logo, format!("club_logos/{club_id}.png"));
    }

    #[tokio::test]
    async fn add_address_geocodes_and_stores() {
        let (app, pool) = test_app_with_geocode(GeoLocation {
            lat: 48.8584,
            lng: 2.2945,
            formatted_address: "Eiffel Tower, Paris, France".into(),
        })
        .await;
        let cookies = register_and_login(&app, "mapper").await;
        let club_id = create_test_club(&app, &cookies, "addrc", "Addr Club").await;

        let res = app
            .oneshot(json_with(
                "POST",
                "/api/club/add-address",
                &cookies,
                json!({ "address": "Eiffel Tower", "club_id": club_id }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = body_json(res).await;
        assert_eq!(body["lat_lng"]["lat"], 48.8584);
        assert_eq!(body["lat_lng"]["lng"], 2.2945);
        assert_eq!(body["formatted_address"], "Eiffel Tower, Paris, France");

        let (addr, coords): (String, String) =
            sqlx::query_as("SELECT address, coordinates FROM clubs WHERE id = ?")
                .bind(club_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(addr, "Eiffel Tower, Paris, France");
        assert!(coords.contains("48.8584"));
    }

    #[tokio::test]
    async fn club_detail_404_for_missing() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "seeker").await;
        let res = app
            .oneshot(get_with("/api/club/9999", &cookies))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn clubs_require_authentication() {
        let (app, _pool) = test_app().await;
        let res = app
            .oneshot(
                Request::builder()
                    .uri("/api/clubs")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
    }
}
