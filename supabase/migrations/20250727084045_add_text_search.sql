ALTER TABLE messages
ADD COLUMN fts tsvector generated always as (to_tsvector('english', text)) stored;

CREATE INDEX IF NOT EXISTS messages_fts_idx ON messages USING GIN (fts);