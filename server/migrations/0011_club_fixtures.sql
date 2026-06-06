-- Phase 9: club-vs-club fixtures + club ELO.
--
-- A fixture is a scheduled match between two clubs. Its lifecycle is
-- proposed -> accepted/declined -> played -> confirmed (both clubs confirm the
-- result), or cancelled before confirmation. Linked games are real `games` rows
-- scoped `external`; both clubs must confirm before any rating moves.

CREATE TABLE club_fixtures (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    home_club_id INTEGER NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    away_club_id INTEGER NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    game_type_id INTEGER          REFERENCES game_types (id) ON DELETE SET NULL,
    date         TEXT,
    status       TEXT    NOT NULL DEFAULT 'proposed',
    created_by   INTEGER          REFERENCES users (id) ON DELETE SET NULL,
    created_at   TEXT    NOT NULL,

    CHECK (status IN ('proposed', 'accepted', 'declined', 'cancelled', 'played', 'confirmed'))
);

CREATE INDEX idx_club_fixtures_home ON club_fixtures (home_club_id);
CREATE INDEX idx_club_fixtures_away ON club_fixtures (away_club_id);

-- M2M: the real games that make up a fixture.
CREATE TABLE fixture_games (
    fixture_id INTEGER NOT NULL REFERENCES club_fixtures (id) ON DELETE CASCADE,
    game_id    INTEGER NOT NULL REFERENCES games (id) ON DELETE CASCADE,
    PRIMARY KEY (fixture_id, game_id)
);

-- One confirmation row per (fixture, club). Both must be 'confirmed' to settle.
CREATE TABLE result_confirmations (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id   INTEGER NOT NULL REFERENCES club_fixtures (id) ON DELETE CASCADE,
    club_id      INTEGER NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    confirmed_by INTEGER          REFERENCES users (id) ON DELETE SET NULL,
    status       TEXT    NOT NULL,
    confirmed_at TEXT,

    UNIQUE (fixture_id, club_id)
);

-- Per-(club, game_type) club rating, mirroring the `elo` skill-state columns so
-- the same pluggable RatingModel drives both player and club ratings.
CREATE TABLE club_elo (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id       INTEGER NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    game_type_id  INTEGER          REFERENCES game_types (id) ON DELETE SET NULL,
    mu            REAL    NOT NULL,
    sigma         REAL    NOT NULL,
    games_played  INTEGER NOT NULL DEFAULT 0,
    model_version TEXT    NOT NULL DEFAULT 'wenglin_bt_v1',
    extra         TEXT    NOT NULL DEFAULT '{}',
    elo           INTEGER NOT NULL DEFAULT 1000,
    updated_at    TEXT    NOT NULL,

    UNIQUE (club_id, game_type_id)
);

CREATE INDEX idx_club_elo_board ON club_elo (game_type_id, elo DESC);
