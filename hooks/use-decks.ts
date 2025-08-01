import { useCallback, useEffect, useMemo, useState } from 'react';

import { User } from '@supabase/supabase-js';

import DecksService from '@/services/decks';
import supabase from '@/supabase/client';
import { Deck } from '@/types/deck';

import { useToast } from './use-toast';

export function useDecks({ user, decks: initialDecks }: { user: User; decks: Deck[] }) {
  const { showError, show } = useToast();
  const [decks, setDecks] = useState<Deck[]>(initialDecks);
  const [loading, setLoading] = useState(false);

  const decksService = useMemo(() => new DecksService(supabase), []);

  const getDecks = useCallback(async () => {
    setLoading(true);

    try {
      const fetchedDecks = await decksService.getDecks(user.id);
      setDecks(fetchedDecks);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to fetch decks');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user.id, showError]);

  const getDeckWithCards = useCallback(
    async (id: string) => {
      const deck = await decksService.getDeckWithCards(id);
      return deck;
    },
    [decksService]
  );

  return {
    decks,
    loading,
    getDecks,
    getDeckWithCards,
  };
}
