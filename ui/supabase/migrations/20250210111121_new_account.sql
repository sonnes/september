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
    "document_id" UUID REFERENCES storage.objects(id) ON DELETE CASCADE,
    "terms_accepted" BOOLEAN,
    "privacy_accepted" BOOLEAN,
    "approved" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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