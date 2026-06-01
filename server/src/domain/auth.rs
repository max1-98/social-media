//! Auth: register / login / logout / JWT, email verification, password reset,
//! age gate, and consent logging.
//!
//! Replaces django-oauth-toolkit + social-auth with in-house argon2 hashing and
//! signed JWT/cookie sessions (tokens stored in the DB, lazy-expired).
//! Ports: `backend/authorization/`, `backend/accounts/` (auth-related views).
