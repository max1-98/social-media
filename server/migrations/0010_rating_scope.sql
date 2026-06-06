-- Rating scope: a single `(user, game_type)` may now carry both an `internal`
-- rating (intra-club SBMM events) and an `external` rating (club-vs-club
-- fixtures), held as two separate `elo` rows linked via `user_elos`. Existing
-- rows are stamped `internal` so matchmaking/display are unchanged.

ALTER TABLE games ADD COLUMN scope TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE elo ADD COLUMN scope TEXT NOT NULL DEFAULT 'internal';

-- Ladder index: per game type + scope, ordered by display elo descending.
CREATE INDEX idx_elo_scope_board ON elo (game_type_id, scope, elo DESC);
