import { useState } from 'react';

import { useAccountContext } from '@/components/context/account-provider';
import DecksService from '@/services/decks';
import supabase from '@/supabase/client';
import { Card, Deck } from '@/types/card';

export function useCreateDeck() {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const { account } = useAccountContext();
  const decksService = new DecksService(supabase);

  const createDeck = async ({
    name,
    cards,
  }: {
    name: string;
    cards: Omit<Card, 'id' | 'deck_id' | 'user_id' | 'created_at'>[];
  }): Promise<Deck> => {
    setStatus('loading');
    try {
      if (!account) {
        throw new Error('User account not found');
      }

      // 1. Create the deck
      const createdDeck = await decksService.createDeck({
        name,
        user_id: account.id,
      });

      // 2. Create cards with deck_id
      const createdCards = await Promise.all(
        cards.map(async (card, index) => {
          return await decksService.createCard({
            text: card.text,
            rank: index,
            deck_id: createdDeck.id,
            user_id: account.id,
            audio_path: card.audio_path,
          });
        })
      );

      return {
        ...createdDeck,
        cards: createdCards,
      };
    } finally {
      setStatus('idle');
    }
  };

  return { createDeck, status };
}
