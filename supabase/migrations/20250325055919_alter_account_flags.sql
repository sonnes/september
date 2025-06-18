-- Add a new column for voice cloning
ALTER TABLE api.accounts ADD COLUMN has_cloned_voice BOOLEAN DEFAULT FALSE;