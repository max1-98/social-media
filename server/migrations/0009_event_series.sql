-- Recurring event series. New feature (no legacy Django equivalent): an
-- `event_series` row is a template + recurrence rule; concrete `events` rows are
-- materialized lazily (see domain::events::materialize_series), tagged with
-- `series_id` so they trace back to their series. Materialized instances are
-- otherwise ordinary events (auto-managed, editable, independently completed).
CREATE TABLE event_series (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id                INTEGER NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    game_type_id           INTEGER REFERENCES game_types (id) ON DELETE SET NULL,
    -- Event template fields (mirror the columns on `events`).
    start_time             TEXT    NOT NULL,
    finish_time            TEXT    NOT NULL,
    number_of_courts       INTEGER NOT NULL,
    sbmm                   INTEGER NOT NULL DEFAULT 1,
    guests_allowed         INTEGER NOT NULL DEFAULT 0,
    over_18_under_18_mixed TEXT,
    -- Recurrence rule.
    frequency              TEXT    NOT NULL,
    interval               INTEGER NOT NULL DEFAULT 1,
    start_date             TEXT    NOT NULL,
    end_date               TEXT    NOT NULL,
    -- Watermark: the last date materialized so far (NULL = nothing yet). Keeps
    -- lazy generation idempotent and avoids resurrecting auto-deleted instances.
    generated_through      TEXT,
    is_active              INTEGER NOT NULL DEFAULT 1,

    CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    CHECK (interval >= 1)
);

CREATE INDEX idx_event_series_club ON event_series (club_id);

-- Link materialized events back to their series (NULL for one-off events).
ALTER TABLE events
    ADD COLUMN series_id INTEGER REFERENCES event_series (id) ON DELETE SET NULL;

CREATE INDEX idx_events_series ON events (series_id);
