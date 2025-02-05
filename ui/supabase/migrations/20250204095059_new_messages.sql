CREATE TABLE api.messages (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE api.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" 
ON api.messages FOR SELECT 
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own messages" 
ON api.messages FOR INSERT 
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own messages" 
ON api.messages FOR DELETE 
TO authenticated
USING ((SELECT auth.uid()) = user_id);
