CREATE TABLE public.cards (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "text" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "deck_id" UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "audio_path" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cards TO authenticated;

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cards" 
ON public.cards FOR SELECT 
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own cards" 
ON public.cards FOR INSERT 
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own cards" 
ON public.cards FOR UPDATE 
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own cards" 
ON public.cards FOR DELETE 
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Create index on deck_id for better query performance
CREATE INDEX idx_cards_deck_id ON public.cards(deck_id);

-- Create index on user_id for better query performance
CREATE INDEX idx_cards_user_id ON public.cards(user_id);

-- Create index on rank for sorting
CREATE INDEX idx_cards_rank ON public.cards(rank); 