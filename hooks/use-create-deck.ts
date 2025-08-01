import { useState } from 'react';

import DecksService from '@/services/decks';
import supabase from '@/supabase/client';
import { Deck, PutCardData, PutDeckData } from '@/types/deck';

export function useCreateDeck() {
  const [creating, setCreating] = useState(false);

  const decksService = new DecksService(supabase);

  const putDeck = async ({
    deck,
    cards,
  }: {
    deck: PutDeckData;
    cards: PutCardData[];
  }): Promise<Deck> => {
    setCreating(true);
    try {
      const createdDeck = await decksService.putDeck(deck);
      const createdCards = await decksService.putCards(cards);

      return {
        ...createdDeck,
        cards: createdCards,
      };
    } finally {
      setCreating(false);
    }
  };

  return { putDeck, creating };
}
