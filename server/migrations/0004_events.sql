-- Events. Mirrors legacy `events.Event` (backend/events/models.py). The per-event
-- stat maps Django stored as JSONField are kept as JSON TEXT for parity; they key
-- on member id (as string) -> int (or nested map for `played_with`).
CREATE TABLE events (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    game_type_id          INTEGER REFERENCES game_types (id) ON DELETE SET NULL,
    club_id               INTEGER NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    date                  TEXT    NOT NULL,
    start_time            TEXT    NOT NULL,
    finish_time           TEXT    NOT NULL,
    number_of_courts      INTEGER NOT NULL,
    sbmm                  INTEGER NOT NULL DEFAULT 1,
    mode                  TEXT    NOT NULL DEFAULT 'sbmm',
    even_teams            INTEGER NOT NULL DEFAULT 1,
    guests_allowed        INTEGER NOT NULL DEFAULT 0,
    over_18_under_18_mixed TEXT,
    -- JSON stat maps (default to empty object)
    player_match_counts   TEXT    NOT NULL DEFAULT '{}',
    wins                  TEXT    NOT NULL DEFAULT '{}',
    played_with           TEXT    NOT NULL DEFAULT '{}',
    winstreaks            TEXT    NOT NULL DEFAULT '{}',
    best_winstreak        TEXT    NOT NULL DEFAULT '{}',
    initial_elo           TEXT    NOT NULL DEFAULT '{}',
    final_elo             TEXT    NOT NULL DEFAULT '{}',
    event_active          INTEGER NOT NULL DEFAULT 0,
    event_complete        INTEGER NOT NULL DEFAULT 0,

    CHECK (mode IN ('sbmm', 'social', 'peg_board'))
);

CREATE INDEX idx_events_club ON events (club_id);
CREATE INDEX idx_events_game_type ON events (game_type_id);

-- M2M: events <-> members (active / in-game / played-one-match)
CREATE TABLE event_active_members (
    event_id  INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, member_id)
);
CREATE TABLE event_in_game_members (
    event_id  INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, member_id)
);
CREATE TABLE event_played_one_match (
    event_id  INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, member_id)
);
