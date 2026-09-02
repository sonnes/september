CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY NOT NULL,
  space_id TEXT NOT NULL REFERENCES spaces (id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_call_id TEXT,
  tool_name TEXT,
  tool_arguments TEXT,
  tool_state TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS agent_messages_by_space_created_at
ON agent_messages (space_id, created_at);

CREATE INDEX IF NOT EXISTS agent_messages_by_tool_call
ON agent_messages (tool_call_id);
