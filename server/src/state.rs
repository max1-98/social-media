//! Shared application state, cloned into every handler by Axum.

use sqlx::SqlitePool;

use crate::config::Config;
use crate::geocode::SharedGeocoder;
use crate::media::SharedStorage;

/// Handler-facing state: the DB pool, runtime config, and the pluggable media
/// store + geocoder (behind traits so tests inject local/mock implementations).
/// Cheap to clone (`SqlitePool` and the `Arc` trait objects are reference-counted;
/// `Config` is small).
#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub config: Config,
    pub storage: SharedStorage,
    pub geocoder: SharedGeocoder,
}

impl AppState {
    pub fn new(
        pool: SqlitePool,
        config: Config,
        storage: SharedStorage,
        geocoder: SharedGeocoder,
    ) -> Self {
        Self {
            pool,
            config,
            storage,
            geocoder,
        }
    }
}
