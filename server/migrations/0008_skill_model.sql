-- Model-agnostic skill state, so the rating algorithm is a swappable component
-- (see docs/rebuild/06b-architecture.md). Adds the columns any rating model
-- needs to the `elo` table and a per-game-type model selector, backfilling
-- existing rows so no rating history is lost.

-- Per-(user, game_type) skill state. mu/sigma are nullable + backfilled; the
-- rest carry safe defaults so the migration is non-breaking.
ALTER TABLE elo ADD COLUMN mu REAL;
ALTER TABLE elo ADD COLUMN sigma REAL;
ALTER TABLE elo ADD COLUMN games_played INTEGER NOT NULL DEFAULT 0;
ALTER TABLE elo ADD COLUMN model_version TEXT NOT NULL DEFAULT 'elo_mov_v1';
ALTER TABLE elo ADD COLUMN extra TEXT NOT NULL DEFAULT '{}';

-- Backfill: skill estimate = the current elo, start with high uncertainty, and
-- reconstruct games_played from the win/lose join tables.
UPDATE elo SET mu = elo WHERE mu IS NULL;
UPDATE elo SET sigma = 350.0 / 3.0 WHERE sigma IS NULL;
UPDATE elo
SET games_played =
    (SELECT COUNT(*) FROM elo_game_wins w WHERE w.elo_id = elo.id) +
    (SELECT COUNT(*) FROM elo_game_loses l WHERE l.elo_id = elo.id);

-- Per-game-type model selection. New game types default to the Weng-Lin model;
-- existing (seeded) types stay on the legacy Elo math so current ratings and the
-- 1000-point display scale are preserved.
ALTER TABLE game_types ADD COLUMN model_version TEXT NOT NULL DEFAULT 'wenglin_bt_v1';
UPDATE game_types SET model_version = 'elo_mov_v1';
