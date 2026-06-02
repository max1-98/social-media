-- Auth + GDPR tables. email_verify / password_reset mirror the legacy
-- `authorization` app (backend/authorization/models.py). `tokens` replaces the
-- django-oauth-toolkit AccessToken/RefreshToken pair with one lean DB-backed,
-- lazy-expiring session row (httpOnly cookies carry the opaque values).

-- Short-lived email verification tokens (legacy 3-hour TTL, enforced lazily).
CREATE TABLE email_verify (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token         TEXT    NOT NULL UNIQUE,
    creation_time TEXT    NOT NULL
);

-- Short-lived password reset tokens (legacy 3-hour TTL, enforced lazily).
CREATE TABLE password_reset (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token         TEXT    NOT NULL UNIQUE,
    creation_time TEXT    NOT NULL
);

-- Session tokens (OAuth2-style password grant). Both opaque values are unique;
-- lazy expiry checks `*_expires_at` on read and sweeps expired rows.
CREATE TABLE tokens (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    access_token       TEXT    NOT NULL UNIQUE,
    refresh_token      TEXT    NOT NULL UNIQUE,
    access_expires_at  TEXT    NOT NULL,
    refresh_expires_at TEXT    NOT NULL,
    created_at         TEXT    NOT NULL
);

CREATE INDEX idx_tokens_user ON tokens (user_id);

-- GDPR consent log: every consent choice (CMP / ads / analytics) is recorded.
-- user_id is nullable so pre-auth (anonymous) banner choices can still be logged,
-- and so the row survives erasure-by-anonymization of the user.
CREATE TABLE consent_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER REFERENCES users (id) ON DELETE SET NULL,
    consent_type TEXT    NOT NULL,
    choice       TEXT    NOT NULL,
    ip_address   TEXT,
    user_agent   TEXT,
    created_at   TEXT    NOT NULL,

    CHECK (choice IN ('accept', 'reject'))
);

CREATE INDEX idx_consent_log_user ON consent_log (user_id);
