//! One application error type with a stable JSON envelope.
//!
//! Every fallible handler returns `Result<_, AppError>`. `IntoResponse` renders
//! `{ "error": { "code", "message" } }` with the right status code, per
//! `.claude/rules/rust.md`. No `unwrap`/`panic!` on request paths.

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

/// Application-level error. The `code` in the JSON envelope is a stable,
/// machine-readable string the frontend can switch on.
#[derive(Debug)]
pub enum AppError {
    /// 400 — request failed validation (bad field, weak password, etc.).
    Validation(String),
    /// 401 — missing/invalid credentials or session.
    Unauthorized(String),
    /// 403 — authenticated but not permitted.
    Forbidden(String),
    /// 404 — resource not found.
    NotFound(String),
    /// 409 — uniqueness/state conflict (duplicate email/username).
    Conflict(String),
    /// 500 — unexpected internal error (DB, etc.). Detail is logged, not exposed.
    Internal(String),
}

impl AppError {
    fn parts(&self) -> (StatusCode, &'static str, &str) {
        match self {
            AppError::Validation(m) => (StatusCode::BAD_REQUEST, "validation_error", m),
            AppError::Unauthorized(m) => (StatusCode::UNAUTHORIZED, "unauthorized", m),
            AppError::Forbidden(m) => (StatusCode::FORBIDDEN, "forbidden", m),
            AppError::NotFound(m) => (StatusCode::NOT_FOUND, "not_found", m),
            AppError::Conflict(m) => (StatusCode::CONFLICT, "conflict", m),
            AppError::Internal(m) => (StatusCode::INTERNAL_SERVER_ERROR, "internal_error", m),
        }
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let (_, code, msg) = self.parts();
        write!(f, "{code}: {msg}")
    }
}

impl std::error::Error for AppError {}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = self.parts();
        // Don't leak internal detail to clients; log it instead.
        let public_message = if status == StatusCode::INTERNAL_SERVER_ERROR {
            tracing::error!(error = %message, "internal error");
            "Something went wrong."
        } else {
            message
        };
        let body = Json(json!({ "error": { "code": code, "message": public_message } }));
        (status, body).into_response()
    }
}

/// Map database errors to `AppError`, translating UNIQUE violations to 409.
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        if let sqlx::Error::Database(db) = &err {
            if db.is_unique_violation() {
                return AppError::Conflict("That value is already taken.".into());
            }
        }
        AppError::Internal(err.to_string())
    }
}
