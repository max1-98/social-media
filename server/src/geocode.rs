//! Geocoding behind a `Geocoder` trait. The rebuild mandates Nominatim
//! (OpenStreetMap), dropping the paid Google Maps key the legacy used.
//!
//! `NominatimGeocoder` calls the public Nominatim search endpoint with a proper
//! `User-Agent` (their usage policy requires one). Handlers depend on the trait
//! so tests inject a mock and never touch the network.
//!
//! Used by club address handling (`AddressToLngLatView`).

use std::sync::Arc;

use serde::Deserialize;

use crate::error::AppError;

/// A geocoding result: coordinates plus the provider's canonical address.
#[derive(Debug, Clone, PartialEq)]
pub struct GeoLocation {
    pub lat: f64,
    pub lng: f64,
    pub formatted_address: String,
}

/// Forward-geocoding abstraction. `Send + Sync` so it lives in shared state.
#[axum::async_trait]
pub trait Geocoder: Send + Sync {
    /// Resolve a free-form address to a single best location, or `NotFound`.
    async fn geocode(&self, address: &str) -> Result<GeoLocation, AppError>;
}

/// Convenience alias for the shared, dynamically-dispatched geocoder.
pub type SharedGeocoder = Arc<dyn Geocoder>;

/// Nominatim-backed geocoder hitting the public OSM endpoint.
pub struct NominatimGeocoder {
    client: reqwest::Client,
    base_url: String,
    user_agent: String,
}

#[derive(Deserialize)]
struct NominatimResult {
    lat: String,
    lon: String,
    display_name: String,
}

impl NominatimGeocoder {
    /// Build a geocoder with the given contact `user_agent` (Nominatim policy
    /// requires an identifying UA with contact info).
    pub fn new(user_agent: impl Into<String>) -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url: "https://nominatim.openstreetmap.org/search".to_string(),
            user_agent: user_agent.into(),
        }
    }
}

#[axum::async_trait]
impl Geocoder for NominatimGeocoder {
    async fn geocode(&self, address: &str) -> Result<GeoLocation, AppError> {
        let resp = self
            .client
            .get(&self.base_url)
            .header(reqwest::header::USER_AGENT, &self.user_agent)
            .query(&[("q", address), ("format", "jsonv2"), ("limit", "1")])
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("geocode request: {e}")))?;

        let results: Vec<NominatimResult> = resp
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("geocode decode: {e}")))?;

        let first = results
            .into_iter()
            .next()
            .ok_or_else(|| AppError::Validation("Invalid address".into()))?;
        let lat = first
            .lat
            .parse()
            .map_err(|_| AppError::Internal("geocode lat parse".into()))?;
        let lng = first
            .lon
            .parse()
            .map_err(|_| AppError::Internal("geocode lon parse".into()))?;
        Ok(GeoLocation {
            lat,
            lng,
            formatted_address: first.display_name,
        })
    }
}

#[cfg(test)]
pub mod test_support {
    use super::*;

    /// A canned geocoder for tests — always returns the configured location.
    pub struct MockGeocoder {
        pub location: GeoLocation,
    }

    #[axum::async_trait]
    impl Geocoder for MockGeocoder {
        async fn geocode(&self, _address: &str) -> Result<GeoLocation, AppError> {
            Ok(self.location.clone())
        }
    }
}
