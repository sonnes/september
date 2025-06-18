-- Add a new table for maintaining account information
CREATE TABLE api.accounts (
    "id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "first_name" TEXT,
    "last_name" TEXT,
    "city" TEXT,
    "country" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "primary_diagnosis" TEXT,
    "year_of_diagnosis" INTEGER,
    "document_path" TEXT,
    "medical_notes" TEXT,
    "terms_accepted" BOOLEAN,
    "privacy_accepted" BOOLEAN,
    "approved" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "has_consent" BOOLEAN DEFAULT FALSE,
    "has_first_message" BOOLEAN DEFAULT FALSE,
    "voice_id" TEXT
);

GRANT SELECT, INSERT, UPDATE ON TABLE api.accounts TO authenticated;

ALTER TABLE api.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own account" 
ON api.accounts FOR SELECT 
TO authenticated
USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert their own account" 
ON api.accounts FOR INSERT 
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own account" 
ON api.accounts FOR UPDATE 
TO authenticated
USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can delete their own account" 
ON api.accounts FOR DELETE 
TO authenticated
USING ((SELECT auth.uid()) = id);