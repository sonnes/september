-- Remove unused fields from accounts table
ALTER TABLE api.accounts
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS country,
DROP COLUMN IF EXISTS contact_name,
DROP COLUMN IF EXISTS contact_email,
DROP COLUMN IF EXISTS has_consent,
DROP COLUMN IF EXISTS has_first_message;

-- Add new columns for name
ALTER TABLE api.accounts
ADD COLUMN "name" TEXT,
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;

-- Update existing records to split name into first and last name
UPDATE api.accounts
SET name = CONCAT(first_name, ' ', last_name)
WHERE first_name IS NOT NULL AND last_name IS NOT NULL;

-- Drop the old first_name and last_name columns
ALTER TABLE api.accounts
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS last_name;

