//! HTTP routing.
//!
//! The single binary serves three things: the JSON API under `/api`, the static
//! SPA build (`web/dist`) at the root, and (later) a media proxy. Real files are
//! served by `ServeDir`; any other non-API path falls back to `index.html` with
//! a 200 so client-side routing works.

use axum::handler::HandlerWithoutStateExt;
use axum::http::StatusCode;
use axum::response::{Html, IntoResponse, Response};
use axum::{routing::get, Json, Router};
use serde_json::{json, Value};
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;

/// Directory the frontend is built into (`web/dist`). Overridable for deploys.
fn web_dist_dir() -> String {
    std::env::var("WEB_DIST_DIR").unwrap_or_else(|_| "web/dist".to_string())
}

pub fn router() -> Router {
    let api = Router::new()
        .route("/health", get(health))
        .route("/hello", get(hello));

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
    use axum::body::to_bytes;
    use axum::http::Request;
    use tower::ServiceExt; // for `oneshot`

    #[tokio::test]
    async fn health_returns_ok() {
        let app = router();
        let res = app
            .oneshot(
                Request::builder()
                    .uri("/api/health")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(res.status(), StatusCode::OK);
        let bytes = to_bytes(res.into_body(), usize::MAX).await.unwrap();
        let body: Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(body["status"], "ok");
    }
}
