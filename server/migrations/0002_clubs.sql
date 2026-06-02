-- Clubs domain. Mirrors legacy `clubs` app (backend/clubs/models.py):
-- Sport, ClubModel, Member, MemberRequest, DummyUser, ClubStatus, plus the
-- M2M join tables Django generated.

CREATE TABLE sports (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE clubs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    club_username  TEXT    NOT NULL,
    name           TEXT    NOT NULL UNIQUE,
    sport_type_id  INTEGER REFERENCES sports (id) ON DELETE SET NULL,
    president_id   INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    info           TEXT,
    date_created   TEXT    NOT NULL,
    logo           TEXT,
    address        TEXT,
    coordinates    TEXT,                  -- JSON
    is_active      INTEGER NOT NULL DEFAULT 1,
    socials        TEXT    NOT NULL DEFAULT '[]'  -- JSON list of {platform,url}
);

CREATE INDEX idx_clubs_president ON clubs (president_id);
CREATE INDEX idx_clubs_sport ON clubs (sport_type_id);

CREATE TABLE members (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id     INTEGER NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    is_member   INTEGER NOT NULL DEFAULT 1,
    is_admin    INTEGER NOT NULL DEFAULT 0,
    date_joined TEXT    NOT NULL
);

CREATE INDEX idx_members_club ON members (club_id);
CREATE INDEX idx_members_user ON members (user_id);

CREATE TABLE member_requests (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id        INTEGER NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    user_id        INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    date_requested TEXT    NOT NULL,
    UNIQUE (club_id, user_id)
);

CREATE TABLE dummy_users (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name        TEXT    NOT NULL,
    surname           TEXT    NOT NULL,
    biological_gender TEXT    NOT NULL DEFAULT 'male',
    club_id           INTEGER NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    CHECK (biological_gender IN ('male', 'female'))
);

CREATE TABLE club_statuses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    event_dates TEXT          -- JSON
);

-- M2M: clubs.bots -> users (legacy clubs_clubmodel_bots)
CREATE TABLE club_bots (
    club_id INTEGER NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (club_id, user_id)
);
