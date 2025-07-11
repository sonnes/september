import { useState } from 'react';

import { v4 as uuidv4 } from 'uuid';

import { triplit } from '@/triplit/client';
import { Card, Deck } from '@/types/card';

export function useCreateDeck() {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');

  const createDeck = async ({
    name,
    cards,
    authorId,
  }: {
    name: string;
    cards: Card[];
    authorId?: string;
  }): Promise<Deck> => {
    setStatus('loading');
    try {
      // 1. Create the deck
      const deckId = uuidv4();
      const createdDeck = await triplit.insert('decks', {
        id: deckId,
        name,
        author_id: authorId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 2. Insert cards with deck_id
      const cardsWithDeck = await Promise.all(
        cards.map(async card => {
          const cardId = card.id || uuidv4();
          const createdCard = await triplit.insert('cards', {
            ...card,
            id: cardId,
            deck_id: deckId,
            created_at: card.created_at || new Date(),
          });
          return createdCard;
        })
      );

      return {
        id: deckId,
        name,
        cards: cardsWithDeck,
      };
    } finally {
      setStatus('idle');
    }
  };

  return { createDeck, status };
}
