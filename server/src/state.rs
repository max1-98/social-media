//! Shared application state, cloned into every handler by Axum.

use sqlx::SqlitePool;

use crate::config::Config;

/// Handler-facing state: the DB pool and runtime config. Cheap to clone
/// (`SqlitePool` is an `Arc` internally; `Config` is small).
#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub config: Config,
}

impl AppState {
    pub fn new(pool: SqlitePool, config: Config) -> Self {
        Self { pool, config }
    }
}
