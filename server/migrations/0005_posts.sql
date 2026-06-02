-- Posts. Mirrors legacy `posts.Post` (backend/posts/models.py). A post belongs to
-- an author (user) and optionally a club.
--
-- GDPR: a post is purely-personal content authored by one user, so on erasure it
-- is hard-deleted (ON DELETE CASCADE) rather than anonymized.
CREATE TABLE posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    content    TEXT    NOT NULL,
    created_at TEXT    NOT NULL,
    author_id  INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    club_id    INTEGER          REFERENCES clubs (id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_author ON posts (author_id);
CREATE INDEX idx_posts_club ON posts (club_id);
