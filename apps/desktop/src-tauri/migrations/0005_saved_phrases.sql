CREATE TABLE IF NOT EXISTS saved_phrases (
  id TEXT PRIMARY KEY NOT NULL,
  space_id TEXT NOT NULL REFERENCES spaces (id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  kind TEXT NOT NULL,
  code TEXT,
  pinned INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS saved_phrases_by_space
ON saved_phrases (space_id, pinned DESC, created_at);
