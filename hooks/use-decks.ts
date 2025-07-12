import { useEffect, useState } from 'react';

import { triplit } from '@/triplit/client';
import { Deck } from '@/types/card';

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDecks() {
      if (!triplit) return;
      const query = triplit.query('decks');
      const allDecks = await triplit.fetch(query);
      setDecks(allDecks);
      setLoading(false);
    }
    fetchDecks();
  }, []);

  return [decks, loading] as const;
}

export function useDeck(id?: string) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeck() {
      if (!id) return;
      if (!triplit) {
        setLoading(false);
        return;
      }
      const deck: Deck | null = await triplit.fetchById('decks', id);
      if (!deck) {
        setLoading(false);
        return;
      }
      const cards = await triplit.fetch(
        triplit.query('cards').Where('deck_id', '=', id).Order('rank', 'ASC')
      );
      deck.cards = cards;
      setDeck(deck);
      setLoading(false);
    }
    fetchDeck();
  }, [id]);

  return [deck, loading] as const;
}
