//! Runtime configuration, read once from the environment at startup.
//!
//! Keeping all `std::env` access here means handlers and domain code take a typed
//! `Config` rather than reaching for env vars ad hoc.

use std::time::Duration;

/// Process configuration. Cloned cheaply into `AppState`.
#[derive(Clone, Debug)]
pub struct Config {
    /// `sqlx` connection string, e.g. `sqlite://data/app.db`.
    pub database_url: String,
    /// Resend API key. When `None`, email sending is a logged no-op (dev/tests).
    pub resend_api_key: Option<String>,
    /// From-address for transactional email.
    pub email_from: String,
    /// Base URL the frontend is served from, used to build email links.
    pub frontend_base_url: String,
    /// Digital-consent age. Registrants younger than this are flagged for
    /// parental consent (GDPR age gate; default 16).
    pub digital_consent_age: u32,
    /// Lifetime of an access token.
    pub access_token_ttl: Duration,
    /// Lifetime of a refresh token.
    pub refresh_token_ttl: Duration,
    /// TTL for email-verify / password-reset tokens (legacy: 3 hours).
    pub short_token_ttl: Duration,
    /// Whether to set the `Secure` flag on auth cookies (off for local HTTP).
    pub cookie_secure: bool,
    /// Local media root dir for `LocalDiskStorage` (club logos etc.).
    pub media_dir: String,
    /// Public base URL media is served under (signed URLs prepend this).
    pub media_base_url: String,
    /// HMAC secret for signing expiring media URLs.
    pub media_secret: String,
    /// Identifying `User-Agent` for the Nominatim geocoder (their policy
    /// requires a contactable UA).
    pub geocoder_user_agent: String,
}

impl Config {
    /// Build config from the environment, applying sensible defaults so the
    /// binary runs locally with zero configuration.
    pub fn from_env() -> Self {
        fn var(key: &str) -> Option<String> {
            std::env::var(key).ok().filter(|v| !v.is_empty())
        }

        Self {
            database_url: var("DATABASE_URL").unwrap_or_else(|| "sqlite://data/app.db".into()),
            resend_api_key: var("RESEND_API_KEY"),
            email_from: var("EMAIL_FROM").unwrap_or_else(|| "no-reply@example.com".into()),
            frontend_base_url: var("FRONTEND_BASE_URL")
                .unwrap_or_else(|| "http://localhost:3000".into()),
            digital_consent_age: var("DIGITAL_CONSENT_AGE")
                .and_then(|v| v.parse().ok())
                .unwrap_or(16),
            access_token_ttl: Duration::from_secs(
                var("ACCESS_TOKEN_TTL_SECS")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(360_000),
            ),
            refresh_token_ttl: Duration::from_secs(
                var("REFRESH_TOKEN_TTL_SECS")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(2_592_000),
            ),
            short_token_ttl: Duration::from_secs(
                var("SHORT_TOKEN_TTL_SECS")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(10_800),
            ),
            cookie_secure: var("COOKIE_SECURE")
                .map(|v| v != "false" && v != "0")
                .unwrap_or(true),
            media_dir: var("MEDIA_DIR").unwrap_or_else(|| "data/media".into()),
            media_base_url: var("MEDIA_BASE_URL").unwrap_or_else(|| "/media".into()),
            media_secret: var("MEDIA_SECRET").unwrap_or_else(|| "dev-insecure-media-secret".into()),
            geocoder_user_agent: var("GEOCODER_USER_AGENT")
                .unwrap_or_else(|| "social-media-rebuild/0.1 (contact@example.com)".into()),
        }
    }
}
