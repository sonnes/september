CREATE TABLE public.messages (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    fts tsvector generated always as (to_tsvector('english', text)) stored,
    "audio_path" TEXT,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS messages_fts_idx ON messages USING GIN (fts);

GRANT SELECT, INSERT, UPDATE ON TABLE public.messages TO authenticated;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" 
ON public.messages FOR SELECT 
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own messages" 
ON public.messages FOR INSERT 
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own messages" 
ON public.messages FOR DELETE 
TO authenticated
USING ((SELECT auth.uid()) = user_id);
