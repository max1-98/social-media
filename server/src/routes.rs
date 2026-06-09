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

use crate::domain::{auth, clubs, elo, events, fixtures, games};
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
        .route("/me", get(auth::me).patch(auth::update_me))
        .route("/profile/:pk", get(auth::simple_profile))
        .route("/navbar_info", get(auth::navbar_info));

    // GDPR data-subject rights. Bare `/account*` paths (not under `/auth`) per the
    // rebuild spec, so merged flat into /api like the clubs routes.
    let account = Router::new()
        .route("/account/export", get(auth::account_export))
        .route("/account", delete(auth::account_delete));

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
        .route("/club/:pk/user-search", get(clubs::search_users))
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
        .route(
            "/club/:pk/logo",
            patch(clubs::upload_logo).delete(clubs::remove_logo),
        )
        .route("/club/add-address", post(clubs::add_address));

    // Events: mirrors backend/events/urls.py. Paths sit directly under /api like
    // the clubs routes, so they're merged. `/events/` (my events) is registered
    // before `/events/:pk` so the literal route wins over the param route.
    let events = Router::new()
        .route("/events", get(events::my_events))
        .route("/events/active", get(events::active_events))
        .route("/events/:pk", get(events::club_events))
        .route("/event/:pk1", get(events::event_detail))
        .route("/event/create/:pk", post(events::create_event))
        .route("/event/series/create/:pk", post(events::create_series))
        .route("/event/series/:series_id", delete(events::cancel_series))
        .route("/event/activate-member", post(events::activate_member))
        .route("/event/deactivate-member", post(events::deactivate_member))
        .route("/event/invite-member", post(events::invite_member))
        .route("/event/start", post(events::start_event))
        .route("/event/complete", post(events::complete_event))
        .route("/event/settings/:pk1", patch(events::update_settings))
        .route("/event/:pk1/stats", get(events::event_stats));

    // Games: mirrors backend/games/urls.py. The legacy app is mounted at `game/`,
    // so each path keeps that prefix and the routes are merged under /api.
    let games = Router::new()
        .route("/game/create-sbmm", post(games::create_sbmm))
        .route("/game/create-social", post(games::create_social))
        .route("/game/get-player_1", post(games::get_player_1))
        .route("/game/create-peg", post(games::create_peg))
        .route("/game/delete", post(games::delete_game))
        .route("/game/complete", post(games::complete_game))
        .route("/game/games/:pk1", get(games::event_incomplete_games))
        .route("/game/event/games/:pk1", get(games::event_complete_games))
        .route("/game/users/games", get(games::user_games))
        .route("/game-types", get(games::list_game_types));

    // Club-vs-club fixtures + club ELO (Phase 9). Flat under /api like clubs.
    let fixtures = Router::new()
        .route(
            "/club/:pk/fixtures",
            post(fixtures::propose_fixture).get(fixtures::list_club_fixtures),
        )
        .route("/fixture/:id", get(fixtures::fixture_detail))
        .route("/fixture/:id/accept", post(fixtures::accept_fixture))
        .route("/fixture/:id/decline", post(fixtures::decline_fixture))
        .route("/fixture/:id/cancel", post(fixtures::cancel_fixture))
        .route("/fixture/:id/confirm", post(fixtures::confirm_fixture))
        .route("/fixture/:id/games", post(fixtures::record_fixture_game))
        .route("/leaderboards/clubs", get(fixtures::club_leaderboard));

    let api = Router::new()
        .route("/health", get(health))
        .route("/hello", get(hello))
        .nest("/auth", auth)
        .nest("/elo", elo)
        .merge(account)
        .merge(clubs)
        .merge(events)
        .merge(games)
        .merge(fixtures);

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
    use crate::id::{ClubId, EventId, GameId, MemberId, SeriesId, UserId};
    use crate::media::LocalDiskStorage;
    use axum::body::{to_bytes, Body};
    use axum::http::{header, Request};
    use sqlx::SqlitePool;
    use std::sync::Arc;
    use time::{Duration, OffsetDateTime};
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

    // Ids cross the API boundary as opaque Sqids strings, but tests still need the
    // raw `i64` PK for direct SQL binds and for paths the server builds from the
    // PK (e.g. `club_logos/<pk>.png`). These helpers round-trip an opaque string
    // back through the typed newtype's `Deserialize` impl to recover the PK —
    // using only the public id API, never hand-decoding.
    fn raw_club(id: &str) -> i64 {
        serde_json::from_value::<ClubId>(json!(id)).unwrap().inner()
    }
    fn raw_event(id: &str) -> i64 {
        serde_json::from_value::<EventId>(json!(id))
            .unwrap()
            .inner()
    }
    fn raw_game(id: &str) -> i64 {
        serde_json::from_value::<GameId>(json!(id)).unwrap().inner()
    }
    fn raw_series(id: &str) -> i64 {
        serde_json::from_value::<SeriesId>(json!(id))
            .unwrap()
            .inner()
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

    #[tokio::test]
    async fn navbar_info_and_simple_profile_parity() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "navuser").await;

        // navbar_info: authenticated user's info, with the legacy `email_verify` key.
        let navbar = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/auth/navbar_info")
                    .header(header::COOKIE, &cookies)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(navbar.status(), StatusCode::OK);
        let body = body_json(navbar).await;
        assert_eq!(body["username"], "navuser");
        assert_eq!(body["email_verify"], false);
        assert!(body.get("email").is_some());

        // simple_profile: any user's public id + username. The first registered
        // user is raw PK 1; address it by its opaque id, never the integer.
        let user_id = UserId::from_raw(1).to_string();
        assert_ne!(user_id, "1", "ids are opaque, not raw integers");
        let profile = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/api/auth/profile/{user_id}"))
                    .header(header::COOKIE, &cookies)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(profile.status(), StatusCode::OK);
        let body = body_json(profile).await;
        assert_eq!(body["id"].as_str().unwrap(), user_id);
        assert_eq!(body["username"], "navuser");

        // A raw integer id is not enumerable: the extractor 404s it.
        let raw = app
            .oneshot(
                Request::builder()
                    .uri("/api/auth/profile/1")
                    .header(header::COOKIE, &cookies)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(raw.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn update_me_rectifies_profile() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "rectifier").await;

        let res = app
            .clone()
            .oneshot(json_with(
                "PATCH",
                "/api/auth/me",
                &cookies,
                json!({ "first_name": "New", "surname": "Name", "biological_gender": "female" }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = body_json(res).await;
        assert_eq!(body["first_name"], "New");
        assert_eq!(body["surname"], "Name");
        assert_eq!(body["biological_gender"], "female");
        // Identity fields are untouched by rectification.
        assert_eq!(body["username"], "rectifier");
        assert_eq!(body["email"], "rectifier@example.com");
    }

    #[tokio::test]
    async fn update_me_rejects_invalid_gender() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "badgender").await;

        let res = app
            .oneshot(json_with(
                "PATCH",
                "/api/auth/me",
                &cookies,
                json!({ "biological_gender": "other" }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
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
    async fn create_test_club(app: &Router, cookies: &str, username: &str, name: &str) -> String {
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
        body_json(res).await["id"].as_str().unwrap().to_string()
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
            .bind(raw_club(&club_id))
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
        let request_id = body[0]["id"].as_str().unwrap().to_string();
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
    async fn user_search_paginates_and_excludes_members() {
        let (app, pool) = test_app().await;
        let prez = register_and_login(&app, "searchprez").await;
        let club_id = create_test_club(&app, &prez, "searchc", "Search Club").await;

        // 12 searchable users sharing a prefix (more than one page of 10).
        for i in 1..=12 {
            register_and_login(&app, &format!("finder{i:02}")).await;
        }

        // Empty query is rejected (no full-directory enumeration).
        let empty = app
            .clone()
            .oneshot(get_with(
                &format!("/api/club/{club_id}/user-search?q="),
                &prez,
            ))
            .await
            .unwrap();
        assert_eq!(empty.status(), StatusCode::BAD_REQUEST);

        // Non-admin cannot search.
        let outsider = register_and_login(&app, "searchoutsider").await;
        let forbidden = app
            .clone()
            .oneshot(get_with(
                &format!("/api/club/{club_id}/user-search?q=finder"),
                &outsider,
            ))
            .await
            .unwrap();
        assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

        // Page 1: 10 results, more to come.
        let page1 = app
            .clone()
            .oneshot(get_with(
                &format!("/api/club/{club_id}/user-search?q=finder&page=1"),
                &prez,
            ))
            .await
            .unwrap();
        assert_eq!(page1.status(), StatusCode::OK);
        let b1 = body_json(page1).await;
        assert_eq!(b1["results"].as_array().unwrap().len(), 10);
        assert_eq!(b1["has_next"], true);
        assert_eq!(b1["page"], 1);
        // Opaque ids only — never the raw integer PK.
        let first_id = b1["results"][0]["id"].as_str().unwrap();
        assert!(first_id.parse::<i64>().is_err());

        // Page 2: the remaining 2, no further pages.
        let page2 = app
            .clone()
            .oneshot(get_with(
                &format!("/api/club/{club_id}/user-search?q=finder&page=2"),
                &prez,
            ))
            .await
            .unwrap();
        let b2 = body_json(page2).await;
        assert_eq!(b2["results"].as_array().unwrap().len(), 2);
        assert_eq!(b2["has_next"], false);

        // Make finder01 a member: they drop out of the results.
        sqlx::query(
            "INSERT INTO members (club_id, user_id, is_member, is_admin, date_joined)
             SELECT ?, id, 1, 0, '2026-01-01T00:00:00Z' FROM users WHERE username = 'finder01'",
        )
        .bind(raw_club(&club_id))
        .execute(&pool)
        .await
        .unwrap();
        let after = app
            .oneshot(get_with(
                &format!("/api/club/{club_id}/user-search?q=finder01"),
                &prez,
            ))
            .await
            .unwrap();
        assert_eq!(
            body_json(after).await["results"].as_array().unwrap().len(),
            0
        );
    }

    #[tokio::test]
    async fn dummy_user_create_returns_id_and_can_activate() {
        let (app, _pool) = test_app().await;
        let prez = register_and_login(&app, "dummyprez").await;
        let club_id = create_test_club(&app, &prez, "dummyc", "Dummy Club").await;
        let event_id = create_test_event(&app, &prez, &club_id).await;

        let created = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/club/dummy-user/create/{club_id}"),
                &prez,
                json!({ "first_name": "Casey", "surname": "Stand-in" }),
            ))
            .await
            .unwrap();
        assert_eq!(created.status(), StatusCode::CREATED);
        let body = body_json(created).await;
        assert_eq!(body["first_name"], "Casey");
        let member_id = body["id"].as_str().unwrap().to_string();
        assert!(member_id.parse::<i64>().is_err(), "id must be opaque");

        // The returned id can be activated straight into the event.
        let activate = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/event/activate-member",
                &prez,
                json!({ "event_id": event_id, "member_id": member_id }),
            ))
            .await
            .unwrap();
        assert_eq!(activate.status(), StatusCode::OK);
        let detail = app
            .oneshot(get_with(&format!("/api/event/{event_id}"), &prez))
            .await
            .unwrap();
        assert_eq!(
            body_json(detail).await["active_members"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
    }

    #[tokio::test]
    async fn invite_member_records_pending_invite_and_adds_to_event() {
        let (app, pool) = test_app().await;
        let prez = register_and_login(&app, "inviteprez").await;
        let club_id = create_test_club(&app, &prez, "invitec", "Invite Club").await;
        let event_id = create_test_event(&app, &prez, &club_id).await;

        // A platform user who isn't in the club yet.
        register_and_login(&app, "invitee").await;
        let invitee_raw: i64 =
            sqlx::query_scalar("SELECT id FROM users WHERE username = 'invitee'")
                .fetch_one(&pool)
                .await
                .unwrap();
        let invitee_id = UserId::from_raw(invitee_raw).to_string();

        // Outsider cannot invite.
        let outsider = register_and_login(&app, "inviteoutsider").await;
        let forbidden = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/event/invite-member",
                &outsider,
                json!({ "event_id": event_id, "user_id": invitee_id }),
            ))
            .await
            .unwrap();
        assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

        // Unknown user -> 404.
        let missing = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/event/invite-member",
                &prez,
                json!({ "event_id": event_id, "user_id": UserId::from_raw(999_999).to_string() }),
            ))
            .await
            .unwrap();
        assert_eq!(missing.status(), StatusCode::NOT_FOUND);

        // Admin invites: 201, returns the member id.
        let invite = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/event/invite-member",
                &prez,
                json!({ "event_id": event_id, "user_id": invitee_id }),
            ))
            .await
            .unwrap();
        assert_eq!(invite.status(), StatusCode::CREATED);
        assert!(body_json(invite).await["member_id"].as_str().is_some());

        // A pending membership invite exists; the membership row is is_member = 0;
        // and the invitee is in the event's active set.
        let requests: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM member_requests WHERE club_id = ? AND user_id = ?",
        )
        .bind(raw_club(&club_id))
        .bind(invitee_raw)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(requests, 1);
        let is_member: i64 =
            sqlx::query_scalar("SELECT is_member FROM members WHERE club_id = ? AND user_id = ?")
                .bind(raw_club(&club_id))
                .bind(invitee_raw)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(is_member, 0);
        let active = app
            .clone()
            .oneshot(get_with(&format!("/api/event/{event_id}"), &prez))
            .await
            .unwrap();
        assert_eq!(
            body_json(active).await["active_members"]
                .as_array()
                .unwrap()
                .len(),
            1
        );

        // Idempotent: inviting again neither duplicates the request nor the member.
        let again = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/event/invite-member",
                &prez,
                json!({ "event_id": event_id, "user_id": invitee_id }),
            ))
            .await
            .unwrap();
        assert_eq!(again.status(), StatusCode::CREATED);
        let request_rows: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM member_requests WHERE club_id = ? AND user_id = ?",
        )
        .bind(raw_club(&club_id))
        .bind(invitee_raw)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(request_rows, 1);
        let member_rows: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM members WHERE club_id = ? AND user_id = ?")
                .bind(raw_club(&club_id))
                .bind(invitee_raw)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(member_rows, 1);

        // Accepting the pending invite upgrades them to a full member.
        let reqs = app
            .clone()
            .oneshot(get_with(&format!("/api/club/requests/{club_id}"), &prez))
            .await
            .unwrap();
        let request_id = body_json(reqs).await[0]["id"].as_str().unwrap().to_string();
        let accept = app
            .oneshot(get_with(
                &format!("/api/club/request-accept/{request_id}/{club_id}"),
                &prez,
            ))
            .await
            .unwrap();
        assert_eq!(accept.status(), StatusCode::CREATED);
        let is_member_after: i64 =
            sqlx::query_scalar("SELECT is_member FROM members WHERE club_id = ? AND user_id = ?")
                .bind(raw_club(&club_id))
                .bind(invitee_raw)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(is_member_after, 1);
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
        .bind(raw_club(&club_id))
        .execute(&pool)
        .await
        .unwrap();
        let member_raw: i64 = sqlx::query_scalar(
            "SELECT m.id FROM members m JOIN users u ON u.id = m.user_id
             WHERE u.username = 'regular'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        let member_id = MemberId::from_raw(member_raw).to_string();

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
        let prez_member_raw: i64 = sqlx::query_scalar(
            "SELECT m.id FROM members m JOIN users u ON u.id = m.user_id
             WHERE u.username = 'headhoncho'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        let prez_member_id = MemberId::from_raw(prez_member_raw).to_string();
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
    async fn list_game_types_returns_seeded_types() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "gtlister").await;

        let res = app
            .oneshot(get_with("/api/game-types", &cookies))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body = body_json(res).await;
        let names: Vec<&str> = body
            .as_array()
            .unwrap()
            .iter()
            .map(|r| r["name"].as_str().unwrap())
            .collect();
        assert!(names.contains(&"badminton singles"), "got {names:?}");
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
        let club_pk = raw_club(&club_id);
        let logo: String = sqlx::query_scalar("SELECT logo FROM clubs WHERE id = ?")
            .bind(club_pk)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(logo, format!("club_logos/{club_pk}.png"));
    }

    #[tokio::test]
    async fn remove_logo_clears_column() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "remover").await;
        let club_id = create_test_club(&app, &cookies, "logod", "Logo Del Club").await;

        // Upload a logo so there is something to remove.
        let boundary = "X-BOUNDARY";
        let body = format!(
            "--{b}\r\nContent-Disposition: form-data; name=\"logo\"; filename=\"l.png\"\r\n\
             Content-Type: image/png\r\n\r\nFAKEPNGDATA\r\n--{b}--\r\n",
            b = boundary
        );
        let upload = Request::builder()
            .method("PATCH")
            .uri(format!("/api/club/{club_id}/logo"))
            .header(header::COOKIE, &cookies)
            .header(
                header::CONTENT_TYPE,
                format!("multipart/form-data; boundary={boundary}"),
            )
            .body(Body::from(body))
            .unwrap();
        assert_eq!(
            app.clone().oneshot(upload).await.unwrap().status(),
            StatusCode::OK
        );

        // Now remove it.
        let req = Request::builder()
            .method("DELETE")
            .uri(format!("/api/club/{club_id}/logo"))
            .header(header::COOKIE, &cookies)
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        assert_eq!(
            body_json(res).await["message"],
            "Club logo removed successfully"
        );
        let logo: Option<String> = sqlx::query_scalar("SELECT logo FROM clubs WHERE id = ?")
            .bind(raw_club(&club_id))
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(logo, None);
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
                .bind(raw_club(&club_id))
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

    // -----------------------------------------------------------------------
    // Events domain
    // -----------------------------------------------------------------------

    /// Create an event for a club via the API and return its id.
    async fn create_test_event(app: &Router, cookies: &str, club_id: &str) -> String {
        let res = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/event/create/{club_id}"),
                cookies,
                json!({
                    "game_type": "badminton singles",
                    "date": "2026-07-01",
                    "start_time": "18:00",
                    "finish_time": "20:00",
                    "number_of_courts": 3,
                    "over_18_under_18_mixed": "all ages"
                }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
        body_json(res).await["id"].as_str().unwrap().to_string()
    }

    #[tokio::test]
    async fn create_event_returns_parity_shape() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "eventprez").await;
        let club_id = create_test_club(&app, &cookies, "evclub", "Event Club").await;

        let res = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/event/create/{club_id}"),
                &cookies,
                json!({
                    "game_type": "badminton singles",
                    "date": "2026-07-01",
                    "start_time": "18:00",
                    "finish_time": "20:00",
                    "number_of_courts": 3,
                    "over_18_under_18_mixed": "all ages"
                }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
        let body = body_json(res).await;
        assert_eq!(body["number_of_courts"], 3);
        assert_eq!(body["sbmm"], true);
        assert_eq!(body["guests_allowed"], false);
        assert_eq!(body["event_active"], false);
        assert_eq!(body["event_complete"], false);
        assert_eq!(body["club"]["name"], "Event Club");
        assert_eq!(body["game_type"]["name"], "badminton singles");
    }

    #[tokio::test]
    async fn create_event_requires_admin() {
        let (app, _pool) = test_app().await;
        let prez = register_and_login(&app, "evadmin").await;
        let club_id = create_test_club(&app, &prez, "evadminc", "Ev Admin").await;
        let outsider = register_and_login(&app, "evoutsider").await;

        let res = app
            .oneshot(json_with(
                "POST",
                &format!("/api/event/create/{club_id}"),
                &outsider,
                json!({
                    "game_type": "badminton singles",
                    "date": "2026-07-01",
                    "start_time": "18:00",
                    "finish_time": "20:00",
                    "number_of_courts": 1
                }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn create_series_materializes_weekly_instances() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "seriesprez").await;
        let club_id = create_test_club(&app, &cookies, "seriesc", "Series Club").await;

        // Weekly series across a ~3 week window starting in the future but within
        // the materialization horizon (~8 weeks): expect 3 instances generated.
        let res = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/event/series/create/{club_id}"),
                &cookies,
                json!({
                    "game_type": "badminton singles",
                    "start_time": "18:00",
                    "finish_time": "20:00",
                    "number_of_courts": 2,
                    "frequency": "weekly",
                    "interval": 1,
                    "start_date": "2099-01-01",
                    "end_date": "2099-01-15"
                }),
            ))
            .await
            .unwrap();
        // Far-future start sits beyond the horizon, so no instances yet but the
        // series is created successfully.
        assert_eq!(res.status(), StatusCode::CREATED);
        let body = body_json(res).await;
        assert!(!body["series_id"].as_str().unwrap().is_empty());
        assert_eq!(body["events"].as_array().unwrap().len(), 0);
    }

    #[tokio::test]
    async fn create_series_generates_and_is_idempotent() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "idemprez").await;
        let club_id = create_test_club(&app, &cookies, "idemc", "Idem Club").await;

        // Daily series within the next few days, fully inside the horizon.
        let today = OffsetDateTime::now_utc().date();
        let start = today.to_string();
        let end = (today + Duration::days(3)).to_string();
        let res = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/event/series/create/{club_id}"),
                &cookies,
                json!({
                    "game_type": "badminton singles",
                    "start_time": "18:00",
                    "finish_time": "20:00",
                    "number_of_courts": 1,
                    "frequency": "daily",
                    "interval": 1,
                    "start_date": start,
                    "end_date": end
                }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
        let body = body_json(res).await;
        // start..=start+3 inclusive = 4 instances.
        assert_eq!(body["events"].as_array().unwrap().len(), 4);

        // Listing the club's events runs materialize again; count must not grow.
        let res = app
            .oneshot(get_with(&format!("/api/events/{club_id}"), &cookies))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM events WHERE club_id = ?")
            .bind(raw_club(&club_id))
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 4);
    }

    #[tokio::test]
    async fn create_series_requires_admin() {
        let (app, _pool) = test_app().await;
        let prez = register_and_login(&app, "seradmin").await;
        let club_id = create_test_club(&app, &prez, "seradminc", "Ser Admin").await;
        let outsider = register_and_login(&app, "seroutsider").await;

        let res = app
            .oneshot(json_with(
                "POST",
                &format!("/api/event/series/create/{club_id}"),
                &outsider,
                json!({
                    "start_time": "18:00",
                    "finish_time": "20:00",
                    "number_of_courts": 1,
                    "frequency": "weekly",
                    "start_date": "2099-01-01",
                    "end_date": "2099-02-01"
                }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn cancel_series_deactivates_and_drops_future() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "cancelprez").await;
        let club_id = create_test_club(&app, &cookies, "cancelc", "Cancel Club").await;

        let today = OffsetDateTime::now_utc().date();
        let res = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/event/series/create/{club_id}"),
                &cookies,
                json!({
                    "start_time": "18:00",
                    "finish_time": "20:00",
                    "number_of_courts": 1,
                    "frequency": "daily",
                    "start_date": today.to_string(),
                    "end_date": (today + Duration::days(3)).to_string()
                }),
            ))
            .await
            .unwrap();
        let series_id = body_json(res).await["series_id"]
            .as_str()
            .unwrap()
            .to_string();

        let res = app
            .clone()
            .oneshot(delete_with(
                &format!("/api/event/series/{series_id}"),
                &cookies,
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        // Future instances (date > today) are dropped; the series is inactive so
        // a re-list does not regenerate them.
        let active: i64 = sqlx::query_scalar("SELECT is_active FROM event_series WHERE id = ?")
            .bind(raw_series(&series_id))
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(active, 0);
        let future: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM events WHERE series_id = ? AND date > ?")
                .bind(raw_series(&series_id))
                .bind(today.to_string())
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(future, 0);
    }

    #[tokio::test]
    async fn event_detail_returns_team_size_and_members() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "detailprez").await;
        let club_id = create_test_club(&app, &cookies, "detailc", "Detail Club").await;
        let event_id = create_test_event(&app, &cookies, &club_id).await;

        let res = app
            .oneshot(get_with(&format!("/api/event/{event_id}"), &cookies))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = body_json(res).await;
        // "badminton singles" -> team_size 1.
        assert_eq!(body["team_size"], 1);
        assert_eq!(body["mode"], "sbmm");
        assert_eq!(body["even_teams"], true);
        assert_eq!(body["active_members"].as_array().unwrap().len(), 0);
        assert_eq!(body["in_game_members"].as_array().unwrap().len(), 0);
    }

    #[tokio::test]
    async fn club_events_list_requires_membership() {
        let (app, _pool) = test_app().await;
        let prez = register_and_login(&app, "listprez").await;
        let club_id = create_test_club(&app, &prez, "evlistc", "Ev List").await;
        create_test_event(&app, &prez, &club_id).await;
        let outsider = register_and_login(&app, "evstranger").await;

        let forbidden = app
            .clone()
            .oneshot(get_with(&format!("/api/events/{club_id}"), &outsider))
            .await
            .unwrap();
        assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

        let ok = app
            .oneshot(get_with(&format!("/api/events/{club_id}"), &prez))
            .await
            .unwrap();
        assert_eq!(ok.status(), StatusCode::OK);
        assert_eq!(body_json(ok).await.as_array().unwrap().len(), 1);
    }

    #[tokio::test]
    async fn my_events_lists_across_memberships() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "myev").await;
        let club_id = create_test_club(&app, &cookies, "myevc", "My Ev Club").await;
        create_test_event(&app, &cookies, &club_id).await;

        let res = app
            .oneshot(get_with("/api/events", &cookies))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = body_json(res).await;
        assert_eq!(body.as_array().unwrap().len(), 1);
        assert_eq!(body[0]["club"]["name"], "My Ev Club");
    }

    #[tokio::test]
    async fn start_and_complete_event_toggle() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "lifecycle").await;
        let club_id = create_test_club(&app, &cookies, "lifec", "Lifecycle Club").await;
        let event_id = create_test_event(&app, &cookies, &club_id).await;

        let start = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/event/start",
                &cookies,
                json!({ "event_id": event_id }),
            ))
            .await
            .unwrap();
        assert_eq!(start.status(), StatusCode::OK);
        assert_eq!(
            body_json(start).await["message"],
            "Event started successfully"
        );

        // Starting again errors (already active).
        let again = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/event/start",
                &cookies,
                json!({ "event_id": event_id }),
            ))
            .await
            .unwrap();
        assert_eq!(again.status(), StatusCode::BAD_REQUEST);

        let complete = app
            .oneshot(json_with(
                "POST",
                "/api/event/complete",
                &cookies,
                json!({ "event_id": event_id }),
            ))
            .await
            .unwrap();
        assert_eq!(complete.status(), StatusCode::OK);
        assert_eq!(
            body_json(complete).await["message"],
            "Event complete status successfully reversed."
        );
    }

    #[tokio::test]
    async fn activate_member_and_settings_and_stats() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "statprez").await;
        let club_id = create_test_club(&app, &cookies, "statc", "Stat Club").await;
        let event_id = create_test_event(&app, &cookies, &club_id).await;

        // The president's own member id.
        let member_id: i64 = sqlx::query_scalar(
            "SELECT m.id FROM members m JOIN users u ON u.id = m.user_id
             WHERE u.username = 'statprez'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        let activate = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/event/activate-member",
                &cookies,
                json!({
                    "event_id": event_id,
                    "member_id": MemberId::from_raw(member_id).to_string(),
                }),
            ))
            .await
            .unwrap();
        assert_eq!(activate.status(), StatusCode::OK);
        assert_eq!(
            body_json(activate).await["message"],
            "Member activated successfully"
        );

        // The active member now appears in the detail.
        let detail = app
            .clone()
            .oneshot(get_with(&format!("/api/event/{event_id}"), &cookies))
            .await
            .unwrap();
        let body = body_json(detail).await;
        assert_eq!(body["active_members"].as_array().unwrap().len(), 1);

        // Update settings to social mode.
        let settings = app
            .clone()
            .oneshot(json_with(
                "PATCH",
                &format!("/api/event/settings/{event_id}"),
                &cookies,
                json!({ "mode": "social", "sbmm": false }),
            ))
            .await
            .unwrap();
        assert_eq!(settings.status(), StatusCode::OK);
        let sbody = body_json(settings).await;
        assert_eq!(sbody["mode"], "social");
        assert_eq!(sbody["sbmm"], false);
        assert_eq!(sbody["even_teams"], true);

        // Seed some stat maps directly, then read the stats endpoint.
        sqlx::query(
            "UPDATE events SET wins = ?, player_match_counts = ?, best_winstreak = ?
             WHERE id = ?",
        )
        .bind(format!("{{\"{member_id}\": 3}}"))
        .bind(format!("{{\"{member_id}\": 4}}"))
        .bind(format!("{{\"{member_id}\": 3}}"))
        .bind(raw_event(&event_id))
        .execute(&pool)
        .await
        .unwrap();

        let stats = app
            .oneshot(get_with(&format!("/api/event/{event_id}/stats"), &cookies))
            .await
            .unwrap();
        assert_eq!(stats.status(), StatusCode::OK);
        let st = body_json(stats).await;
        assert_eq!(st["most_wins_players"][0]["wins"], 3);
        assert_eq!(st["best_winstreak_players"][0]["best_winstreak"], 3);
        assert_eq!(st["most_games_played_players"][0]["games_played"], 4);
        // win_rate = 3 / (4 - 3) = 3.0
        assert_eq!(st["highest_win_rate_players"][0]["win_rate"], 3.0);
        // No final_elo set -> empty elo-gain list.
        assert_eq!(st["highest_elo_gain_players"].as_array().unwrap().len(), 0);
    }

    #[tokio::test]
    async fn active_events_is_not_implemented() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "deprecated").await;
        let res = app
            .oneshot(get_with("/api/events/active", &cookies))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::NOT_IMPLEMENTED);
    }

    #[tokio::test]
    async fn event_detail_404_for_missing() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "evseeker").await;
        let res = app
            .oneshot(get_with("/api/event/9999", &cookies))
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

    // -----------------------------------------------------------------------
    // Games domain
    // -----------------------------------------------------------------------

    /// Register a user, add them as an active member of `event_id` in `club_id`
    /// (both opaque api ids), seed a badminton-singles (game_type 1) rating row at
    /// `elo`/`streak`, and return the new raw member PK (for SQL + opaque encoding
    /// at call sites).
    async fn seed_active_member(
        pool: &SqlitePool,
        club_id: &str,
        event_id: &str,
        username: &str,
        gender: &str,
        elo: i64,
        streak: i64,
    ) -> i64 {
        let club_id = raw_club(club_id);
        let event_id = raw_event(event_id);
        sqlx::query(
            "INSERT INTO users (username, email, password_hash, first_name, surname,
                                date_of_birth, biological_gender, is_active, date_joined)
             VALUES (?, ?, 'x', 'F', 'L', '1995-01-01', ?, 1, '2026-01-01T00:00:00Z')",
        )
        .bind(username)
        .bind(format!("{username}@example.com"))
        .bind(gender)
        .execute(pool)
        .await
        .unwrap();
        let user_id: i64 = sqlx::query_scalar("SELECT id FROM users WHERE username = ?")
            .bind(username)
            .fetch_one(pool)
            .await
            .unwrap();

        sqlx::query(
            "INSERT INTO members (club_id, user_id, is_member, is_admin, date_joined)
             VALUES (?, ?, 1, 0, '2026-01-01T00:00:00Z')",
        )
        .bind(club_id)
        .bind(user_id)
        .execute(pool)
        .await
        .unwrap();
        let member_id: i64 =
            sqlx::query_scalar("SELECT id FROM members WHERE user_id = ? AND club_id = ?")
                .bind(user_id)
                .bind(club_id)
                .fetch_one(pool)
                .await
                .unwrap();

        let elo_id: i64 = sqlx::query_scalar(
            "INSERT INTO elo (game_type_id, elo, last_game, winstreak, best_winstreak)
             VALUES (1, ?, '2026-05-01', ?, ?) RETURNING id",
        )
        .bind(elo)
        .bind(streak)
        .bind(streak)
        .fetch_one(pool)
        .await
        .unwrap();
        sqlx::query("INSERT INTO user_elos (user_id, elo_id) VALUES (?, ?)")
            .bind(user_id)
            .bind(elo_id)
            .execute(pool)
            .await
            .unwrap();

        sqlx::query("INSERT INTO event_active_members (event_id, member_id) VALUES (?, ?)")
            .bind(event_id)
            .bind(member_id)
            .execute(pool)
            .await
            .unwrap();
        member_id
    }

    #[tokio::test]
    async fn peg_create_complete_updates_elo_and_stats() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "gameadmin").await;
        let club_id = create_test_club(&app, &cookies, "gamec", "Game Club").await;
        let event_id = create_test_event(&app, &cookies, &club_id).await;

        // Two equal-rated singles players, both active.
        let m1 = seed_active_member(&pool, &club_id, &event_id, "p_one", "male", 1000, 0).await;
        let m2 = seed_active_member(&pool, &club_id, &event_id, "p_two", "male", 1000, 0).await;

        let m1_id = MemberId::from_raw(m1).to_string();
        let m2_id = MemberId::from_raw(m2).to_string();

        // Peg the teams: m1 vs m2 (singles -> team_size 1).
        let create = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/game/create-peg",
                &cookies,
                json!({ "event_id": event_id, "member_ids": [m1_id, m2_id] }),
            ))
            .await
            .unwrap();
        assert_eq!(create.status(), StatusCode::CREATED);
        let game = body_json(create).await;
        let game_id = game["id"].as_str().unwrap().to_string();
        assert_eq!(game["team1"].as_array().unwrap().len(), 1);
        assert_eq!(game["team2"].as_array().unwrap().len(), 1);
        assert_eq!(game["team1"][0]["id"], m1_id);
        assert_eq!(game["team1"][0]["elo"], 1000);

        // Members moved active -> in_game.
        let active_after: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM event_active_members WHERE event_id = ?")
                .bind(raw_event(&event_id))
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(active_after, 0);

        // Complete with team1 winning 21-15 (diff 6). Equal teams + sbmm on:
        // g(6)=0.8, p=0.5 -> winner +0.3*40 = +12, loser -12 (rating oracle).
        let complete = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/game/complete",
                &cookies,
                json!({ "game_id": game_id, "event_id": event_id, "score": "21,15" }),
            ))
            .await
            .unwrap();
        assert_eq!(complete.status(), StatusCode::OK);
        assert_eq!(
            body_json(complete).await["message"],
            "Game completed successfully"
        );

        // Deterministic elo deltas via the oracle.
        let elo1: i64 = sqlx::query_scalar(
            "SELECT e.elo FROM user_elos ue JOIN elo e ON e.id = ue.elo_id
             JOIN members m ON m.user_id = ue.user_id WHERE m.id = ? AND e.game_type_id = 1",
        )
        .bind(m1)
        .fetch_one(&pool)
        .await
        .unwrap();
        let elo2: i64 = sqlx::query_scalar(
            "SELECT e.elo FROM user_elos ue JOIN elo e ON e.id = ue.elo_id
             JOIN members m ON m.user_id = ue.user_id WHERE m.id = ? AND e.game_type_id = 1",
        )
        .bind(m2)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(elo1, 1012);
        assert_eq!(elo2, 988);

        // The skill-model columns are persisted alongside the legacy `elo`:
        // for the Elo model the display value equals `mu`, and `games_played`
        // increments for both players.
        let (mu1, gp1): (f64, i64) = sqlx::query_as(
            "SELECT e.mu, e.games_played FROM user_elos ue JOIN elo e ON e.id = ue.elo_id
             JOIN members m ON m.user_id = ue.user_id WHERE m.id = ? AND e.game_type_id = 1",
        )
        .bind(m1)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(mu1, 1012.0);
        assert_eq!(gp1, 1);

        // Players reactivated; win/match stat maps updated.
        let active_now: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM event_active_members WHERE event_id = ?")
                .bind(raw_event(&event_id))
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(active_now, 2);
        let wins: String = sqlx::query_scalar("SELECT wins FROM events WHERE id = ?")
            .bind(raw_event(&event_id))
            .fetch_one(&pool)
            .await
            .unwrap();
        assert!(wins.contains(&format!("\"{m1}\":1")) || wins.contains(&format!("\"{m1}\": 1")));

        // Completed game appears in the event's completed list.
        let listed = app
            .clone()
            .oneshot(get_with(
                &format!("/api/game/event/games/{event_id}"),
                &cookies,
            ))
            .await
            .unwrap();
        assert_eq!(listed.status(), StatusCode::OK);
        let body = body_json(listed).await;
        assert_eq!(body.as_array().unwrap().len(), 1);
        assert_eq!(body[0]["score"], "21,15");
    }

    #[tokio::test]
    async fn complete_rejects_score_below_21() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "scoreadmin").await;
        let club_id = create_test_club(&app, &cookies, "scorec", "Score Club").await;
        let event_id = create_test_event(&app, &cookies, &club_id).await;
        let m1 = seed_active_member(&pool, &club_id, &event_id, "s_one", "male", 1000, 0).await;
        let m2 = seed_active_member(&pool, &club_id, &event_id, "s_two", "male", 1000, 0).await;

        let create = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/game/create-peg",
                &cookies,
                json!({
                    "event_id": event_id,
                    "member_ids": [
                        MemberId::from_raw(m1).to_string(),
                        MemberId::from_raw(m2).to_string(),
                    ],
                }),
            ))
            .await
            .unwrap();
        let game_id = body_json(create).await["id"].as_str().unwrap().to_string();

        // No team reached 21 -> validation error.
        let res = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/game/complete",
                &cookies,
                json!({ "game_id": game_id, "event_id": event_id, "score": "15,18" }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);

        // Malformed score -> validation error.
        let bad = app
            .oneshot(json_with(
                "POST",
                "/api/game/complete",
                &cookies,
                json!({ "game_id": game_id, "event_id": event_id, "score": "nonsense" }),
            ))
            .await
            .unwrap();
        assert_eq!(bad.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn delete_game_reverts_players() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "deladmin").await;
        let club_id = create_test_club(&app, &cookies, "delc", "Del Club").await;
        let event_id = create_test_event(&app, &cookies, &club_id).await;
        let m1 = seed_active_member(&pool, &club_id, &event_id, "d_one", "male", 1000, 0).await;
        let m2 = seed_active_member(&pool, &club_id, &event_id, "d_two", "male", 1000, 0).await;

        let create = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/game/create-peg",
                &cookies,
                json!({
                    "event_id": event_id,
                    "member_ids": [
                        MemberId::from_raw(m1).to_string(),
                        MemberId::from_raw(m2).to_string(),
                    ],
                }),
            ))
            .await
            .unwrap();
        let game_id = body_json(create).await["id"].as_str().unwrap().to_string();

        let del = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/game/delete",
                &cookies,
                json!({ "game_id": game_id, "event_id": event_id }),
            ))
            .await
            .unwrap();
        assert_eq!(del.status(), StatusCode::NO_CONTENT);

        // Game gone, players back to active.
        let games: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM games WHERE id = ?")
            .bind(raw_game(&game_id))
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(games, 0);
        let active: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM event_active_members WHERE event_id = ?")
                .bind(raw_event(&event_id))
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(active, 2);
    }

    #[tokio::test]
    async fn sbmm_create_builds_singles_game() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "sbmmadmin").await;
        let club_id = create_test_club(&app, &cookies, "sbmmc", "SBMM Club").await;
        let event_id = create_test_event(&app, &cookies, &club_id).await;
        seed_active_member(&pool, &club_id, &event_id, "sb_one", "male", 1000, 0).await;
        seed_active_member(&pool, &club_id, &event_id, "sb_two", "male", 1010, 0).await;

        let create = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/game/create-sbmm",
                &cookies,
                json!({ "event_id": event_id }),
            ))
            .await
            .unwrap();
        assert_eq!(create.status(), StatusCode::CREATED);
        let game = body_json(create).await;
        // Singles: one player each side, distinct, both moved out of active.
        assert_eq!(game["team1"].as_array().unwrap().len(), 1);
        assert_eq!(game["team2"].as_array().unwrap().len(), 1);
        assert_ne!(game["team1"][0]["id"], game["team2"][0]["id"]);
        let active: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM event_active_members WHERE event_id = ?")
                .bind(raw_event(&event_id))
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(active, 0);
    }

    #[tokio::test]
    async fn create_game_requires_enough_players() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "fewadmin").await;
        let club_id = create_test_club(&app, &cookies, "fewc", "Few Club").await;
        let event_id = create_test_event(&app, &cookies, &club_id).await;
        // Only one active member: not enough for singles (needs 2).
        seed_active_member(&pool, &club_id, &event_id, "f_one", "male", 1000, 0).await;

        let res = app
            .oneshot(json_with(
                "POST",
                "/api/game/create-sbmm",
                &cookies,
                json!({ "event_id": event_id }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn peg_get_player_1_returns_simple_member() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "pegadmin").await;
        let club_id = create_test_club(&app, &cookies, "pegc", "Peg Club").await;
        let event_id = create_test_event(&app, &cookies, &club_id).await;
        let m1 = seed_active_member(&pool, &club_id, &event_id, "pg_one", "male", 1000, 0).await;
        seed_active_member(&pool, &club_id, &event_id, "pg_two", "male", 1000, 0).await;

        let res = app
            .oneshot(json_with(
                "POST",
                "/api/game/get-player_1",
                &cookies,
                json!({ "event_id": event_id }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = body_json(res).await;
        // SimpleMemberSerializer has no elo field; id is one of the active members.
        assert!(body.get("elo").is_none());
        let id = body["id"].as_str().unwrap();
        let m1_id = MemberId::from_raw(m1).to_string();
        let m2_id = MemberId::from_raw(m1 + 1).to_string();
        assert!(id == m1_id || id == m2_id);
    }

    #[tokio::test]
    async fn user_games_lists_completed_for_user() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "ugadmin").await;
        let club_id = create_test_club(&app, &cookies, "ugc", "UG Club").await;
        let event_id = create_test_event(&app, &cookies, &club_id).await;
        let m1 = seed_active_member(&pool, &club_id, &event_id, "ug_one", "male", 1000, 0).await;
        let m2 = seed_active_member(&pool, &club_id, &event_id, "ug_two", "male", 1000, 0).await;

        let create = app
            .clone()
            .oneshot(json_with(
                "POST",
                "/api/game/create-peg",
                &cookies,
                json!({
                    "event_id": event_id,
                    "member_ids": [
                        MemberId::from_raw(m1).to_string(),
                        MemberId::from_raw(m2).to_string(),
                    ],
                }),
            ))
            .await
            .unwrap();
        let game_id = body_json(create).await["id"].as_str().unwrap().to_string();
        app.clone()
            .oneshot(json_with(
                "POST",
                "/api/game/complete",
                &cookies,
                json!({ "game_id": game_id, "event_id": event_id, "score": "21,15" }),
            ))
            .await
            .unwrap();

        // The seeded player's password is a placeholder, so copy a real argon2
        // hash from the admin (registered with the standard test password) onto
        // `ug_one`, then log in as them and fetch their recent games.
        let argon_hash = sqlx::query_scalar::<_, String>(
            "SELECT password_hash FROM users WHERE username = 'ugadmin'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        sqlx::query("UPDATE users SET password_hash = ? WHERE username = 'ug_one'")
            .bind(&argon_hash)
            .execute(&pool)
            .await
            .unwrap();
        let login = app
            .clone()
            .oneshot(post(
                "/api/auth/login",
                json!({ "username": "ug_one", "password": "123ThisPasswordRocks!" }),
            ))
            .await
            .unwrap();
        assert_eq!(login.status(), StatusCode::OK);
        let player_cookies = cookies_from(&login);

        let res = app
            .oneshot(get_with("/api/game/users/games", &player_cookies))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = body_json(res).await;
        assert_eq!(body.as_array().unwrap().len(), 1);
        assert_eq!(body[0]["score"], "21,15");
        // `game_type_name` is the additive convenience field; the legacy
        // `game_type` id is still present.
        assert_eq!(body[0]["game_type_name"], "badminton singles");
        assert!(body[0]["game_type"].is_number());
    }

    // -----------------------------------------------------------------------
    // GDPR data-subject rights: export + erasure-by-anonymization
    // -----------------------------------------------------------------------

    #[tokio::test]
    async fn account_export_requires_auth() {
        let (app, _pool) = test_app().await;
        let res = app
            .oneshot(
                Request::builder()
                    .uri("/api/account/export")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn account_export_returns_user_data() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "exporter").await;

        // A consent choice and a club membership should appear in the export.
        app.clone()
            .oneshot(json_with(
                "POST",
                "/api/auth/consent",
                &cookies,
                json!({ "consent_type": "ads", "choice": "accept" }),
            ))
            .await
            .unwrap();
        create_test_club(&app, &cookies, "expclub", "Export Club").await;

        let res = app
            .oneshot(get_with("/api/account/export", &cookies))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        assert_eq!(
            res.headers()
                .get(header::CONTENT_DISPOSITION)
                .and_then(|v| v.to_str().ok()),
            Some("attachment; filename=\"account-export.json\"")
        );
        let body = body_json(res).await;
        assert_eq!(body["user"]["username"], "exporter");
        assert_eq!(body["user"]["email"], "exporter@example.com");
        assert!(body["user"].get("password_hash").is_none());
        assert_eq!(body["consents"].as_array().unwrap().len(), 1);
        assert_eq!(body["consents"][0]["choice"], "accept");
        assert_eq!(body["memberships"].as_array().unwrap().len(), 1);
        assert_eq!(body["memberships"][0]["club_name"], "Export Club");
        assert_eq!(body["memberships"][0]["is_admin"], true);
        assert!(body["posts"].is_array());
    }

    #[tokio::test]
    async fn account_delete_requires_auth() {
        let (app, _pool) = test_app().await;
        let res = app
            .oneshot(json_with(
                "DELETE",
                "/api/account",
                "",
                json!({ "password": "123ThisPasswordRocks!" }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn account_delete_rejects_wrong_password() {
        let (app, _pool) = test_app().await;
        let cookies = register_and_login(&app, "wrongpw").await;
        let res = app
            .oneshot(json_with(
                "DELETE",
                "/api/account",
                &cookies,
                json!({ "password": "not-my-password" }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn account_delete_anonymizes_and_preserves_shared_history() {
        let (app, pool) = test_app().await;
        let cookies = register_and_login(&app, "leaver").await;
        // Membership (shared history) + a post (purely personal).
        create_test_club(&app, &cookies, "leaveclub", "Leave Club").await;
        let user_id: i64 = sqlx::query_scalar("SELECT id FROM users WHERE username = 'leaver'")
            .fetch_one(&pool)
            .await
            .unwrap();
        sqlx::query("INSERT INTO posts (content, created_at, author_id) VALUES ('bye', '2026-01-01T00:00:00Z', ?)")
            .bind(user_id)
            .execute(&pool)
            .await
            .unwrap();

        let res = app
            .clone()
            .oneshot(json_with(
                "DELETE",
                "/api/account",
                &cookies,
                json!({ "password": "123ThisPasswordRocks!" }),
            ))
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        assert_eq!(body_json(res).await["detail"], "Account deleted.");

        // Row kept but anonymized + tombstoned.
        let row = sqlx::query!(
            "SELECT username, email, first_name, date_of_birth, is_tombstoned, is_active
             FROM users WHERE id = ?",
            user_id
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(row.username, format!("deleted_user_{user_id}"));
        assert!(row.email.is_none());
        assert!(row.first_name.is_none());
        assert!(row.date_of_birth.is_none());
        assert_eq!(row.is_tombstoned, 1);
        assert_eq!(row.is_active, 0);

        // Shared history (membership) survives; personal post + tokens are gone.
        let members: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM members WHERE user_id = ?")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(members, 1);
        let posts: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM posts WHERE author_id = ?")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(posts, 0);
        let tokens: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM tokens WHERE user_id = ?")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(tokens, 0);

        // The old credentials can no longer authenticate.
        let login = app
            .oneshot(post(
                "/api/auth/login",
                json!({ "username": "leaver", "password": "123ThisPasswordRocks!" }),
            ))
            .await
            .unwrap();
        assert_eq!(login.status(), StatusCode::UNAUTHORIZED);
    }

    // =====================================================================
    // Phase 9: club-vs-club fixtures + club ELO.
    // =====================================================================

    fn raw_fixture(id: &str) -> i64 {
        serde_json::from_value::<crate::id::FixtureId>(json!(id))
            .unwrap()
            .inner()
    }

    /// Insert a verified, active member of `club_id` and return its member id.
    /// `verified` toggles the email-verified flag (eligibility gate input).
    async fn seed_club_member(
        pool: &SqlitePool,
        club_id: &str,
        username: &str,
        verified: bool,
        active: bool,
    ) -> i64 {
        let club_id = raw_club(club_id);
        let verified = i64::from(verified);
        let active = i64::from(active);
        sqlx::query(
            "INSERT INTO users (username, email, password_hash, first_name, surname,
                                date_of_birth, biological_gender, is_active, email_verified,
                                date_joined)
             VALUES (?, ?, 'x', 'F', 'L', '1995-01-01', 'male', ?, ?, '2026-01-01T00:00:00Z')",
        )
        .bind(username)
        .bind(format!("{username}@example.com"))
        .bind(active)
        .bind(verified)
        .execute(pool)
        .await
        .unwrap();
        let user_id: i64 = sqlx::query_scalar("SELECT id FROM users WHERE username = ?")
            .bind(username)
            .fetch_one(pool)
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO members (club_id, user_id, is_member, is_admin, date_joined)
             VALUES (?, ?, 1, 0, '2026-01-01T00:00:00Z')",
        )
        .bind(club_id)
        .bind(user_id)
        .execute(pool)
        .await
        .unwrap();
        sqlx::query_scalar("SELECT id FROM members WHERE user_id = ? AND club_id = ?")
            .bind(user_id)
            .bind(club_id)
            .fetch_one(pool)
            .await
            .unwrap()
    }

    /// Read the legacy display elo for a member at a scope (None if no row).
    async fn member_elo(pool: &SqlitePool, member_id: i64, scope: &str) -> Option<i64> {
        sqlx::query_scalar(
            "SELECT e.elo FROM user_elos ue JOIN elo e ON e.id = ue.elo_id
             JOIN members m ON m.user_id = ue.user_id
             WHERE m.id = ? AND e.game_type_id = 1 AND e.scope = ?",
        )
        .bind(member_id)
        .bind(scope)
        .fetch_optional(pool)
        .await
        .unwrap()
    }

    /// Drive propose -> accept and return the fixture id string.
    async fn propose_and_accept(
        app: &Router,
        home_cookies: &str,
        away_cookies: &str,
        home_club: &str,
        away_club: &str,
    ) -> String {
        let propose = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/club/{home_club}/fixtures"),
                home_cookies,
                json!({ "away_club": away_club, "game_type": "badminton singles" }),
            ))
            .await
            .unwrap();
        assert_eq!(propose.status(), StatusCode::CREATED);
        let fixture = body_json(propose).await;
        assert_eq!(fixture["status"], "proposed");
        let fixture_id = fixture["id"].as_str().unwrap().to_string();

        let accept = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/fixture/{fixture_id}/accept"),
                away_cookies,
                json!({}),
            ))
            .await
            .unwrap();
        assert_eq!(accept.status(), StatusCode::OK);
        assert_eq!(body_json(accept).await["status"], "accepted");
        fixture_id
    }

    #[tokio::test]
    async fn fixture_full_flow_moves_external_and_club_elo_only() {
        let (app, pool) = test_app().await;
        let home_admin = register_and_login(&app, "fix_home_admin").await;
        let away_admin = register_and_login(&app, "fix_away_admin").await;
        let home = create_test_club(&app, &home_admin, "fixhome", "Fix Home").await;
        let away = create_test_club(&app, &away_admin, "fixaway", "Fix Away").await;

        // One verified real player per club.
        let hp = seed_club_member(&pool, &home, "fix_hp", true, true).await;
        let ap = seed_club_member(&pool, &away, "fix_ap", true, true).await;

        let fixture_id = propose_and_accept(&app, &home_admin, &away_admin, &home, &away).await;

        // Record a game: home player beats away player 21-15 (diff 6).
        let rec = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/fixture/{fixture_id}/games"),
                &home_admin,
                json!({
                    "home_team": [MemberId::from_raw(hp).to_string()],
                    "away_team": [MemberId::from_raw(ap).to_string()],
                    "score": "21,15",
                }),
            ))
            .await
            .unwrap();
        assert_eq!(rec.status(), StatusCode::CREATED);

        // External elo moved; internal untouched (no internal row exists).
        let hp_ext = member_elo(&pool, hp, "external").await.unwrap();
        let ap_ext = member_elo(&pool, ap, "external").await.unwrap();
        assert!(hp_ext > ap_ext, "winner external elo should exceed loser");
        assert!(member_elo(&pool, hp, "internal").await.is_none());
        assert!(member_elo(&pool, ap, "internal").await.is_none());

        // One-sided confirm: nothing settles, no club_elo yet.
        let c1 = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/fixture/{fixture_id}/confirm"),
                &home_admin,
                json!({}),
            ))
            .await
            .unwrap();
        assert_eq!(c1.status(), StatusCode::OK);
        assert_eq!(body_json(c1).await["status"], "played");
        let club_rows: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM club_elo")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(club_rows, 0, "one-sided confirm must not move club elo");

        // Second confirm settles: both club_elo rows created, status confirmed.
        let c2 = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/fixture/{fixture_id}/confirm"),
                &away_admin,
                json!({}),
            ))
            .await
            .unwrap();
        assert_eq!(c2.status(), StatusCode::OK);
        assert_eq!(body_json(c2).await["status"], "confirmed");

        let (home_elo, away_elo): (i64, i64) = sqlx::query_as(
            "SELECT
               (SELECT elo FROM club_elo WHERE club_id = ?),
               (SELECT elo FROM club_elo WHERE club_id = ?)",
        )
        .bind(raw_club(&home))
        .bind(raw_club(&away))
        .fetch_one(&pool)
        .await
        .unwrap();
        // Winning club's conservative rating exceeds the losing club's.
        assert!(home_elo > away_elo, "home {home_elo} away {away_elo}");
        let club_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM club_elo")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(club_count, 2);
    }

    #[tokio::test]
    async fn fixture_rejects_dummy_or_unverified_players() {
        let (app, pool) = test_app().await;
        let home_admin = register_and_login(&app, "rej_home_admin").await;
        let away_admin = register_and_login(&app, "rej_away_admin").await;
        let home = create_test_club(&app, &home_admin, "rejhome", "Rej Home").await;
        let away = create_test_club(&app, &away_admin, "rejaway", "Rej Away").await;

        let hp = seed_club_member(&pool, &home, "rej_hp", true, true).await;
        // Unverified away player -> ineligible.
        let ap = seed_club_member(&pool, &away, "rej_ap", false, true).await;

        let fixture_id = propose_and_accept(&app, &home_admin, &away_admin, &home, &away).await;

        let rec = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/fixture/{fixture_id}/games"),
                &home_admin,
                json!({
                    "home_team": [MemberId::from_raw(hp).to_string()],
                    "away_team": [MemberId::from_raw(ap).to_string()],
                    "score": "21,15",
                }),
            ))
            .await
            .unwrap();
        assert_eq!(rec.status(), StatusCode::BAD_REQUEST);

        // No game or external rating was persisted.
        let games: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM games WHERE scope = 'external'")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(games, 0);
        assert!(member_elo(&pool, hp, "external").await.is_none());
    }

    #[tokio::test]
    async fn decline_and_cancel_block_recording() {
        let (app, pool) = test_app().await;
        let home_admin = register_and_login(&app, "dc_home_admin").await;
        let away_admin = register_and_login(&app, "dc_away_admin").await;
        let home = create_test_club(&app, &home_admin, "dchome", "DC Home").await;
        let away = create_test_club(&app, &away_admin, "dcaway", "DC Away").await;
        let hp = seed_club_member(&pool, &home, "dc_hp", true, true).await;
        let ap = seed_club_member(&pool, &away, "dc_ap", true, true).await;

        // Propose, then the away club declines.
        let propose = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/club/{home}/fixtures"),
                &home_admin,
                json!({ "away_club": away, "game_type": "badminton singles" }),
            ))
            .await
            .unwrap();
        let fixture_id = body_json(propose).await["id"].as_str().unwrap().to_string();
        let decline = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/fixture/{fixture_id}/decline"),
                &away_admin,
                json!({}),
            ))
            .await
            .unwrap();
        assert_eq!(decline.status(), StatusCode::OK);
        assert_eq!(body_json(decline).await["status"], "declined");

        // Recording on a declined fixture is rejected.
        let rec = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/fixture/{fixture_id}/games"),
                &home_admin,
                json!({
                    "home_team": [MemberId::from_raw(hp).to_string()],
                    "away_team": [MemberId::from_raw(ap).to_string()],
                    "score": "21,15",
                }),
            ))
            .await
            .unwrap();
        assert_eq!(rec.status(), StatusCode::BAD_REQUEST);
        let _ = raw_fixture(&fixture_id);
    }

    #[tokio::test]
    async fn propose_requires_home_admin_and_accept_requires_away_admin() {
        let (app, _pool) = test_app().await;
        let home_admin = register_and_login(&app, "pa_home_admin").await;
        let away_admin = register_and_login(&app, "pa_away_admin").await;
        let outsider = register_and_login(&app, "pa_outsider").await;
        let home = create_test_club(&app, &home_admin, "pahome", "PA Home").await;
        let away = create_test_club(&app, &away_admin, "paaway", "PA Away").await;

        // Outsider cannot propose for the home club.
        let bad = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/club/{home}/fixtures"),
                &outsider,
                json!({ "away_club": away }),
            ))
            .await
            .unwrap();
        assert_eq!(bad.status(), StatusCode::FORBIDDEN);

        let fixture_id = {
            let propose = app
                .clone()
                .oneshot(json_with(
                    "POST",
                    &format!("/api/club/{home}/fixtures"),
                    &home_admin,
                    json!({ "away_club": away }),
                ))
                .await
                .unwrap();
            body_json(propose).await["id"].as_str().unwrap().to_string()
        };

        // The home admin cannot accept their own proposal (away-admin only).
        let self_accept = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/fixture/{fixture_id}/accept"),
                &home_admin,
                json!({}),
            ))
            .await
            .unwrap();
        assert_eq!(self_accept.status(), StatusCode::FORBIDDEN);

        let ok = app
            .clone()
            .oneshot(json_with(
                "POST",
                &format!("/api/fixture/{fixture_id}/accept"),
                &away_admin,
                json!({}),
            ))
            .await
            .unwrap();
        assert_eq!(ok.status(), StatusCode::OK);
    }
}
