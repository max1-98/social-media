//! Domain modules, mirroring the existing Django apps 1:1 so the parity port
//! (Phase 4) is auditable app-by-app against `backend/`.
//!
//! Each submodule is a placeholder in Phase 1; handlers, models, and services
//! are filled in once the data model + auth (Phase 3) exist.

pub mod auth; // ports backend/authorization + backend/accounts auth flows
pub mod clubs; // ports backend/clubs
pub mod elo; // ports backend/elo (see also crate::rating)
pub mod events; // ports backend/events
pub mod games; // ports backend/games (see also crate::matchmaking)
pub mod posts; // ports backend/posts
