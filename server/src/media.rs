//! Media: upload/resize (the `image` crate) and storage on Cloudflare R2 via the
//! S3 API, with signed expiring URLs. Replaces local-disk media so it survives
//! cheap/ephemeral hosting. Ports the upload paths in `backend/clubs/`.
