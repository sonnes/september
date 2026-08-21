CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL CHECK (json_valid(value))
) STRICT;

CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,
  context TEXT,
  phrases_synced_count INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS spaces_by_user_updated_at
ON spaces (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  space_id TEXT,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  type TEXT NOT NULL,
  audio_path TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (space_id) REFERENCES spaces (id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS messages_by_space_created_at
ON messages (space_id, created_at);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  space_id TEXT,
  name TEXT,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (space_id) REFERENCES spaces (id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS notes_by_space_updated_at
ON notes (space_id, updated_at DESC);
