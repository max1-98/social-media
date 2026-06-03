//! Media storage: an object store behind a `Storage` trait, with signed expiring
//! URLs (GDPR rule: media is served via signed, time-limited URLs).
//!
//! `LocalDiskStorage` writes under a configurable media dir and is used in dev
//! and tests (no network). `R2Storage` is a config-gated stub kept behind the
//! same trait — the real Cloudflare R2 / S3 SigV4 path lands at deploy (Phase 7).
//!
//! Ports the upload paths in `backend/clubs/` (`ClubImageView`).

use std::path::PathBuf;
use std::sync::Arc;

use hmac::{Hmac, Mac};
use sha2::Sha256;

use crate::error::AppError;

type HmacSha256 = Hmac<Sha256>;

/// A stored object: the storage key and a signed URL clients can fetch.
///
/// Callers that only persist (e.g. the club-logo upload, which echoes a legacy
/// `{ "message" }` shape) discard these, so they're allowed to go unread.
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct StoredObject {
    pub key: String,
    pub url: String,
}

/// Object storage abstraction. Implementations persist bytes and mint signed,
/// expiring URLs. `Send + Sync` so it lives in shared state.
#[axum::async_trait]
pub trait Storage: Send + Sync {
    /// Persist `bytes` under `key` with the given `content_type`.
    async fn put(
        &self,
        key: &str,
        bytes: &[u8],
        content_type: &str,
    ) -> Result<StoredObject, AppError>;

    /// Delete the object at `key`. Missing objects are treated as success
    /// (idempotent), so removing an already-gone logo is not an error.
    async fn delete(&self, key: &str) -> Result<(), AppError>;

    /// Build a signed URL for `key`, valid for `ttl_secs` seconds.
    fn signed_url(&self, key: &str, ttl_secs: u64) -> String;
}

/// Convenience alias for the shared, dynamically-dispatched store.
pub type SharedStorage = Arc<dyn Storage>;

/// Default signed-URL lifetime (seconds). Mirrors a short-lived presigned link.
pub const DEFAULT_URL_TTL_SECS: u64 = 3600;

/// Local-disk store: writes files under `root`, signs URLs with `secret` and an
/// `expires` query param. Used for dev/tests; survives without any cloud creds.
pub struct LocalDiskStorage {
    root: PathBuf,
    base_url: String,
    secret: Vec<u8>,
}

impl LocalDiskStorage {
    /// Build a store rooted at `root`, serving under `base_url` (e.g. `/media`),
    /// signing with `secret`.
    pub fn new(
        root: impl Into<PathBuf>,
        base_url: impl Into<String>,
        secret: impl Into<Vec<u8>>,
    ) -> Self {
        Self {
            root: root.into(),
            base_url: base_url.into(),
            secret: secret.into(),
        }
    }

    /// Compute the hex HMAC-SHA256 signature for `key` expiring at `expires`.
    fn sign(&self, key: &str, expires: u64) -> Result<String, AppError> {
        let mut mac = HmacSha256::new_from_slice(&self.secret)
            .map_err(|e| AppError::Internal(format!("hmac key: {e}")))?;
        mac.update(key.as_bytes());
        mac.update(b":");
        mac.update(expires.to_string().as_bytes());
        Ok(hex::encode(mac.finalize().into_bytes()))
    }
}

#[axum::async_trait]
impl Storage for LocalDiskStorage {
    async fn put(
        &self,
        key: &str,
        bytes: &[u8],
        _content_type: &str,
    ) -> Result<StoredObject, AppError> {
        let path = self.root.join(key);
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| AppError::Internal(format!("media mkdir: {e}")))?;
        }
        tokio::fs::write(&path, bytes)
            .await
            .map_err(|e| AppError::Internal(format!("media write: {e}")))?;
        Ok(StoredObject {
            key: key.to_string(),
            url: self.signed_url(key, DEFAULT_URL_TTL_SECS),
        })
    }

    async fn delete(&self, key: &str) -> Result<(), AppError> {
        match tokio::fs::remove_file(self.root.join(key)).await {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(AppError::Internal(format!("media delete: {e}"))),
        }
    }

    fn signed_url(&self, key: &str, ttl_secs: u64) -> String {
        let expires = now_unix() + ttl_secs;
        // Signing can only fail on an empty key; fall back to an unsigned URL.
        let sig = self.sign(key, expires).unwrap_or_default();
        format!(
            "{}/{}?expires={}&sig={}",
            self.base_url.trim_end_matches('/'),
            key,
            expires,
            sig
        )
    }
}

/// Config-gated R2/S3 store. Behind the same trait so handlers don't change.
// TODO Phase 7 deploy: implement Cloudflare R2 via S3 SigV4 (presigned PUT/GET).
#[allow(dead_code)]
pub struct R2Storage {
    pub bucket: String,
    pub account_id: String,
    pub access_key_id: String,
    pub secret_access_key: String,
}

#[axum::async_trait]
impl Storage for R2Storage {
    async fn put(
        &self,
        _key: &str,
        _bytes: &[u8],
        _content_type: &str,
    ) -> Result<StoredObject, AppError> {
        // TODO Phase 7 deploy: PUT to R2 via SigV4.
        Err(AppError::Internal("R2 storage not configured.".into()))
    }

    async fn delete(&self, _key: &str) -> Result<(), AppError> {
        // TODO Phase 7 deploy: DELETE object via SigV4.
        Ok(())
    }

    fn signed_url(&self, _key: &str, _ttl_secs: u64) -> String {
        // TODO Phase 7 deploy: presigned GET.
        String::new()
    }
}

/// Validate an uploaded image: content-type must be `image/*` and size capped.
/// Returns the file extension to use for the stored key.
pub fn validate_image(content_type: &str, len: usize) -> Result<&'static str, AppError> {
    const MAX_BYTES: usize = 5 * 1024 * 1024; // 5 MiB
    if len == 0 {
        return Err(AppError::Validation("Empty file.".into()));
    }
    if len > MAX_BYTES {
        return Err(AppError::Validation("Image too large (max 5 MiB).".into()));
    }
    match content_type {
        "image/jpeg" | "image/jpg" => Ok("jpg"),
        "image/png" => Ok("png"),
        "image/gif" => Ok("gif"),
        "image/webp" => Ok("webp"),
        other if other.starts_with("image/") => Ok("img"),
        _ => Err(AppError::Validation(
            "Uploaded file must be an image.".into(),
        )),
    }
}

fn now_unix() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_non_image() {
        assert!(validate_image("text/plain", 10).is_err());
        assert!(validate_image("application/pdf", 10).is_err());
    }

    #[test]
    fn accepts_known_image_types() {
        assert_eq!(validate_image("image/png", 10).unwrap(), "png");
        assert_eq!(validate_image("image/jpeg", 10).unwrap(), "jpg");
        assert_eq!(validate_image("image/svg+xml", 10).unwrap(), "img");
    }

    #[test]
    fn rejects_oversize_and_empty() {
        assert!(validate_image("image/png", 0).is_err());
        assert!(validate_image("image/png", 6 * 1024 * 1024).is_err());
    }

    #[tokio::test]
    async fn local_disk_put_and_signed_url() {
        let dir = std::env::temp_dir().join(format!("media-test-{}", now_unix()));
        let store = LocalDiskStorage::new(&dir, "/media", b"secret".to_vec());
        let obj = store
            .put("club_logos/1.png", b"hello", "image/png")
            .await
            .unwrap();
        assert_eq!(obj.key, "club_logos/1.png");
        assert!(obj.url.contains("/media/club_logos/1.png?expires="));
        assert!(obj.url.contains("&sig="));
        let written = tokio::fs::read(dir.join("club_logos/1.png")).await.unwrap();
        assert_eq!(written, b"hello");
        let _ = tokio::fs::remove_dir_all(&dir).await;
    }

    #[tokio::test]
    async fn local_disk_delete_is_idempotent() {
        let dir = std::env::temp_dir().join(format!("media-del-{}", now_unix()));
        let store = LocalDiskStorage::new(&dir, "/media", b"secret".to_vec());
        store
            .put("club_logos/1.png", b"hello", "image/png")
            .await
            .unwrap();
        store.delete("club_logos/1.png").await.unwrap();
        assert!(!dir.join("club_logos/1.png").exists());
        // Deleting an already-gone object still succeeds.
        store.delete("club_logos/1.png").await.unwrap();
        let _ = tokio::fs::remove_dir_all(&dir).await;
    }

    #[test]
    fn signature_is_deterministic_per_expiry() {
        let store = LocalDiskStorage::new("/tmp/x", "/media", b"k".to_vec());
        let a = store.sign("club_logos/1.png", 100).unwrap();
        let b = store.sign("club_logos/1.png", 100).unwrap();
        let c = store.sign("club_logos/1.png", 200).unwrap();
        assert_eq!(a, b);
        assert_ne!(a, c);
    }
}
