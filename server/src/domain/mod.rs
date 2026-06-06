//! Domain modules, mirroring the existing Django apps 1:1 so the parity port
//! (Phase 4) is auditable app-by-app against `backend/`.
//!
//! Each submodule is a placeholder in Phase 1; handlers, models, and services
//! are filled in once the data model + auth (Phase 3) exist.

pub mod auth; // ports backend/authorization + backend/accounts auth flows
pub mod club_elo; // pure club-vs-club rating update (Phase 9)
pub mod clubs; // ports backend/clubs
pub mod elo; // ports backend/elo (see also crate::rating)
pub mod events; // ports backend/events
pub mod fixtures; // club-vs-club fixtures + club ELO (Phase 9)
pub mod games; // ports backend/games (see also crate::matchmaking)
pub mod posts; // ports backend/posts
