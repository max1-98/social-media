-- Seed reference data: sports + game types. Mirrors the legacy
-- `initial_sports` management command (backend/games/management/commands/
-- sports.py + gametypes.py). Idempotent: skip rows that already exist.
INSERT INTO sports (name)
SELECT v.name FROM (
    SELECT 'badminton' AS name UNION ALL
    SELECT 'tennis'    UNION ALL
    SELECT 'padel'     UNION ALL
    SELECT 'snooker'   UNION ALL
    SELECT 'pool'
) AS v
WHERE NOT EXISTS (SELECT 1 FROM sports s WHERE s.name = v.name);

INSERT INTO game_types (name, description, sport_id, team_size)
SELECT v.name, v.description,
       (SELECT id FROM sports WHERE name = v.sport), v.team_size
FROM (
    SELECT 'badminton singles' AS name, 'badminton' AS sport, 1 AS team_size,
           'Two people, one either side of the court play a game of first to 21. The court is long and thin.' AS description
    UNION ALL SELECT 'badminton doubles', 'badminton', 2,
           'Four people, two on each side of the court, play a game of first to 21. The long is wide and short on the serve, then full court.'
    UNION ALL SELECT 'tennis singles', 'tennis', 1,
           'Two people, one on each side of the court, play a game of singles tennis.'
    UNION ALL SELECT 'tennis doubles', 'tennis', 2,
           'Four people, two on each side of the court, play a game of doubles tennis.'
    UNION ALL SELECT 'padel doubles', 'padel', 2,
           'Four people, two on each side of the court, play a game of doubles padel.'
    UNION ALL SELECT 'pool singles', 'pool', 1,
           'Where two people face off in a game of pool'
    UNION ALL SELECT 'pool doubles', 'pool', 2,
           'Two vs two pool.'
    UNION ALL SELECT 'snooker singles', 'snooker', 1,
           'One vs one snooker.'
) AS v
WHERE NOT EXISTS (SELECT 1 FROM game_types g WHERE g.name = v.name);

-- Keep the sport_game_types M2M in sync with the seeded rows.
INSERT INTO sport_game_types (sport_id, game_type_id)
SELECT g.sport_id, g.id FROM game_types g
WHERE g.sport_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM sport_game_types sgt
      WHERE sgt.sport_id = g.sport_id AND sgt.game_type_id = g.id
  );
