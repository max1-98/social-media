-- Users / identity. Mirrors legacy `accounts.CustomUser`
-- (backend/accounts/models.py) plus GDPR-by-design columns.
--
-- GDPR: PII columns (email, first_name, surname, date_of_birth,
-- biological_gender) are nullable so erasure-by-anonymization can null them
-- while keeping the pseudonymous row (`is_tombstoned`) for shared history.
CREATE TABLE users (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    username                  TEXT    NOT NULL UNIQUE,
    -- PII (nullable for tombstoning)
    email                     TEXT             UNIQUE,
    first_name                TEXT,
    surname                   TEXT,
    date_of_birth             TEXT,
    biological_gender         TEXT    NOT NULL DEFAULT 'male',
    -- credentials & state
    password_hash             TEXT    NOT NULL,
    email_verified            INTEGER NOT NULL DEFAULT 0,
    is_active                 INTEGER NOT NULL DEFAULT 1,
    is_staff                  INTEGER NOT NULL DEFAULT 0,
    is_superuser              INTEGER NOT NULL DEFAULT 0,
    date_joined               TEXT    NOT NULL,
    last_login                TEXT,
    -- premium tier (legacy roadmap) + GDPR tombstone marker
    tier                      TEXT    NOT NULL DEFAULT 'free',
    is_tombstoned             INTEGER NOT NULL DEFAULT 0,
    -- age gate: minors are created flagged until parental consent is granted
    parental_consent_required INTEGER NOT NULL DEFAULT 0,
    parental_consent_granted  INTEGER NOT NULL DEFAULT 0,

    CHECK (biological_gender IN ('male', 'female'))
);

CREATE UNIQUE INDEX idx_users_username ON users (username);
CREATE UNIQUE INDEX idx_users_email ON users (email);
