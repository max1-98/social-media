//! Public id encoding — keep internal integer PKs off the wire.
//!
//! The database uses sequential `i64` primary keys (fast, compact, great index
//! locality). But a *sequential* id in a URL or JSON body is a privacy leak: it
//! lets anyone enumerate resources, scrape, and infer total counts / growth
//! rate (the "German tank problem"). So every id that crosses the API boundary
//! is wrapped in a typed newtype that (de)serialises as a short opaque
//! [Sqids](https://sqids.org/) string, e.g. `123` ⇄ `"Xk9d2"`.
//!
//! Each entity has its own newtype carrying a distinct numeric tag.
//! The tag is encoded *alongside* the id (`[TAG, id]`) and verified on decode,
//! so a `ClubId` string can never be replayed against a user endpoint and the
//! entities can't be confused.
//!
//! Caveat: Sqids is reversible obfuscation, **not** encryption or an
//! authorization control — it only raises the bar against casual enumeration and
//! hides counts. Ownership/permission checks remain mandatory in every handler.

use std::sync::OnceLock;

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use serde::de::DeserializeOwned;
use sqids::Sqids;

use crate::error::AppError;

/// Process-wide encoder. Initialised once from config in `main`; falls back to a
/// deterministic default (used by unit/integration tests that don't call
/// [`init`]). Encode and decode always go through the same instance.
static SQIDS: OnceLock<Sqids> = OnceLock::new();

/// Configure the global encoder from runtime config. Call once at startup before
/// serving. A custom alphabet means the mapping isn't the library default, so it
/// can't be reproduced without the configured value. No-op if already set.
pub fn init(alphabet: Option<&str>, min_length: u8) {
    let _ = SQIDS.set(build(alphabet, min_length));
}

fn build(alphabet: Option<&str>, min_length: u8) -> Sqids {
    let mut builder = Sqids::builder().min_length(min_length);
    if let Some(a) = alphabet {
        builder = builder.alphabet(a.chars().collect());
    }
    // The only failure modes are a too-short/duplicate alphabet; fall back to the
    // default encoder rather than panicking on a misconfigured env var.
    builder.build().unwrap_or_default()
}

fn sqids() -> &'static Sqids {
    SQIDS.get_or_init(|| build(None, DEFAULT_MIN_LENGTH))
}

/// Default opaque-id length when no config is supplied (keeps test ids short but
/// non-trivial).
pub const DEFAULT_MIN_LENGTH: u8 = 8;

fn encode(tag: u64, id: i64) -> String {
    // Ids are positive autoincrement PKs; the cast is lossless. If encoding ever
    // failed we'd still rather emit *something* opaque than panic on a request
    // path, so fall back to encoding without the tag.
    sqids()
        .encode(&[tag, id as u64])
        .unwrap_or_else(|_| format!("{tag}-{id}"))
}

fn decode(tag: u64, s: &str) -> Result<i64, AppError> {
    let nums = sqids().decode(s);
    match nums.as_slice() {
        [t, id] if *t == tag => Ok(*id as i64),
        _ => Err(AppError::NotFound("Not found.".into())),
    }
}

/// Define an entity public-id newtype: an opaque `i64` wrapper that serialises to
/// / parses from a tagged Sqids string. `from_raw`/`inner` are inherent so callers
/// need only import the newtype, not a trait.
macro_rules! public_id {
    ($(#[$doc:meta])* $name:ident = $tag:literal) => {
        $(#[$doc])*
        #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
        pub struct $name(i64);

        impl $name {
            /// Entity discriminator mixed into the encoding so ids aren't cross-usable.
            const TAG: u64 = $tag;

            // Symmetric codec surface: every entity gets both, even though a given
            // entity may only ever be constructed (`from_raw`) or only unwrapped
            // (`inner`). `allow(dead_code)` keeps the API uniform without per-entity
            // noise in this single-binary crate.
            /// Wrap a raw database PK.
            #[allow(dead_code)]
            pub fn from_raw(id: i64) -> Self {
                Self(id)
            }

            /// The raw database PK, for handing to sqlx.
            #[allow(dead_code)]
            pub fn inner(&self) -> i64 {
                self.0
            }
        }

        impl From<i64> for $name {
            fn from(id: i64) -> Self {
                Self(id)
            }
        }

        impl std::fmt::Display for $name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                f.write_str(&encode($name::TAG, self.0))
            }
        }

        impl serde::Serialize for $name {
            fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
                s.serialize_str(&encode($name::TAG, self.0))
            }
        }

        impl<'de> serde::Deserialize<'de> for $name {
            fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
                let s = String::deserialize(d)?;
                decode($name::TAG, &s)
                    .map(Self)
                    .map_err(|_| serde::de::Error::custom("invalid id"))
            }
        }
    };
}

public_id!(
    /// Public id for a user / profile (`users.id`).
    UserId = 1
);
public_id!(
    /// Public id for a club (`clubs.id`).
    ClubId = 2
);
public_id!(
    /// Public id for a club membership (`members.id`).
    MemberId = 3
);
public_id!(
    /// Public id for a member join request (`member_requests.id`).
    RequestId = 4
);
public_id!(
    /// Public id for an event (`events.id`).
    EventId = 5
);
public_id!(
    /// Public id for a game (`games.id`).
    GameId = 6
);
public_id!(
    /// Public id for a post (`posts.id`).
    PostId = 7
);

/// Path extractor that decodes tagged public ids and maps **any** failure
/// (malformed string, wrong entity tag, missing segment) to a uniform `404`, so
/// the API never reveals whether a raw id is well-formed or which ids exist.
///
/// Works for a single id (`ApiPath<ClubId>`) and tuples
/// (`ApiPath<(ClubId, MemberId)>`) by delegating to Axum's `Path`.
pub struct ApiPath<T>(pub T);

#[axum::async_trait]
impl<T, S> FromRequestParts<S> for ApiPath<T>
where
    T: DeserializeOwned + Send,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        axum::extract::Path::<T>::from_request_parts(parts, state)
            .await
            .map(|axum::extract::Path(v)| ApiPath(v))
            .map_err(|_| AppError::NotFound("Not found.".into()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_through_the_opaque_string() {
        let id = ClubId::from_raw(123);
        let encoded = id.to_string();
        assert_ne!(encoded, "123", "raw id must not appear verbatim");
        let back: ClubId = serde_json::from_value(serde_json::json!(encoded)).unwrap();
        assert_eq!(back.inner(), 123);
    }

    #[test]
    fn rejects_a_string_minted_for_another_entity() {
        // Same underlying id, encoded as a club, must not decode as a user.
        let as_club = ClubId::from_raw(42).to_string();
        let parsed: Result<UserId, _> = serde_json::from_value(serde_json::json!(as_club));
        assert!(parsed.is_err(), "cross-entity id must be rejected");
    }

    #[test]
    fn rejects_a_raw_integer_and_garbage() {
        for bad in ["42", "", "not-a-sqid!"] {
            let parsed: Result<ClubId, _> = serde_json::from_value(serde_json::json!(bad));
            assert!(parsed.is_err(), "{bad:?} should not decode");
        }
    }

    #[test]
    fn distinct_ids_encode_distinctly() {
        assert_ne!(
            ClubId::from_raw(1).to_string(),
            ClubId::from_raw(2).to_string()
        );
        // ...and the same raw id under different tags differs too.
        assert_ne!(
            ClubId::from_raw(1).to_string(),
            UserId::from_raw(1).to_string()
        );
    }
}
