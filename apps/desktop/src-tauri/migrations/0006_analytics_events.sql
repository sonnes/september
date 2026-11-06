CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data))
) STRICT;

CREATE INDEX IF NOT EXISTS analytics_events_by_user_timestamp
ON analytics_events (user_id, timestamp DESC);

