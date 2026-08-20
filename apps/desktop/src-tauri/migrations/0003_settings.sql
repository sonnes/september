CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE settings_next (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL CHECK (json_valid(value))
) STRICT;

INSERT INTO settings_next (key, value)
SELECT key, value FROM settings;

DROP TABLE settings;
ALTER TABLE settings_next RENAME TO settings;

DROP TABLE IF EXISTS records;
DROP TABLE IF EXISTS file_metadata;
DROP TABLE IF EXISTS outbox;
DROP TABLE IF EXISTS sync_metadata;
