import { useCallback, useEffect, useMemo, useState } from 'react';

import { User } from '@supabase/supabase-js';

import DecksService from '@/services/decks';
import supabase from '@/supabase/client';
import { removeRealtimeSubscription, subscribeToTable } from '@/supabase/realtime';
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

  useEffect(() => {
    if (initialDecks.length === 0) {
      getDecks();
    }
  }, [user.id, initialDecks.length, getDecks]);

  // Realtime subscription for decks
  useEffect(() => {
    const channel = subscribeToTable<Deck>('decks', user.id, {
      onInsert: newDeck => {
        setDecks(prev => [newDeck, ...prev]);
      },
      onUpdate: updatedDeck => {
        setDecks(prev => prev.map(deck => (deck.id === updatedDeck.id ? updatedDeck : deck)));
      },
      onDelete: deletedDeck => {
        setDecks(prev => prev.filter(deck => deck.id !== deletedDeck.id));
      },
      onError: error => {
        console.error('Decks realtime error:', error);
        showError('Failed to receive real-time updates');
      },
      onSubscribe: status => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to decks changes');
        }
      },
    });

    // Cleanup function to unsubscribe on unmount
    return () => {
      removeRealtimeSubscription(channel);
    };
  }, [user.id, showError]);

  return {
    decks,
    loading,
    getDecks,
  };
}
