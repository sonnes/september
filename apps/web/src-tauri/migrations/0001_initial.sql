CREATE TABLE records (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT,
  version TEXT,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  seq INTEGER NOT NULL,
  PRIMARY KEY (collection, id)
);
CREATE INDEX records_collection_live ON records(collection, deleted, id);
CREATE INDEX records_sequence ON records(seq);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE file_metadata (
  id TEXT PRIMARY KEY,
  relative_name TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  media_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
