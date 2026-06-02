-- Games + ELO. Mirrors legacy `games` and `elo` apps
-- (backend/games/models.py, backend/elo/models.py).

CREATE TABLE game_types (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL,
    sport_id    INTEGER REFERENCES sports (id) ON DELETE SET NULL,
    team_size   INTEGER NOT NULL DEFAULT 2
);

-- M2M: sports.game_types <-> game_types (legacy clubs_sport_game_types)
CREATE TABLE sport_game_types (
    sport_id     INTEGER NOT NULL REFERENCES sports (id) ON DELETE CASCADE,
    game_type_id INTEGER NOT NULL REFERENCES game_types (id) ON DELETE CASCADE,
    PRIMARY KEY (sport_id, game_type_id)
);

CREATE TABLE games (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    game_type_id INTEGER REFERENCES game_types (id) ON DELETE SET NULL,
    start_time   TEXT    NOT NULL,
    score        TEXT
);

-- Teams: M2M games <-> members (team1 / team2 / all_users)
CREATE TABLE game_team1 (
    game_id   INTEGER NOT NULL REFERENCES games (id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, member_id)
);
CREATE TABLE game_team2 (
    game_id   INTEGER NOT NULL REFERENCES games (id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, member_id)
);
CREATE TABLE game_all_users (
    game_id   INTEGER NOT NULL REFERENCES games (id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, member_id)
);

CREATE TABLE elo (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    game_type_id   INTEGER REFERENCES game_types (id) ON DELETE SET NULL,
    elo            INTEGER NOT NULL DEFAULT 1000,
    last_game      TEXT    NOT NULL,
    winstreak      INTEGER NOT NULL DEFAULT 0,
    best_winstreak INTEGER NOT NULL DEFAULT 0
);

-- M2M: users.elos <-> elo (legacy accounts_customuser_elos)
CREATE TABLE user_elos (
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    elo_id  INTEGER NOT NULL REFERENCES elo (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, elo_id)
);

-- M2M: elo.game_wins / game_loses <-> games
CREATE TABLE elo_game_wins (
    elo_id  INTEGER NOT NULL REFERENCES elo (id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games (id) ON DELETE CASCADE,
    PRIMARY KEY (elo_id, game_id)
);
CREATE TABLE elo_game_loses (
    elo_id  INTEGER NOT NULL REFERENCES elo (id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games (id) ON DELETE CASCADE,
    PRIMARY KEY (elo_id, game_id)
);
