'use client';

import React, { useEffect, useState } from 'react';

import { useParams } from 'next/navigation';

import AudioPlayer from '@/components/audio-player';
import DeckView from '@/components/deck/view';
import Layout from '@/components/layout';
import { AudioPlayerProvider } from '@/hooks/use-audio-player';
import { triplit } from '@/triplit/client';
import { Card, Deck } from '@/types/card';

const DeckPage: React.FC = () => {
  const params = useParams();
  const id =
    typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
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

  return (
    <>
      <Layout>
        <Layout.Header>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-white">Read &gt; {deck?.name}</h1>
          </div>
        </Layout.Header>
        <Layout.Content>
          <AudioPlayerProvider>
            {loading && <div>Loading deck...</div>}
            {!loading && !deck && <div>Deck not found.</div>}
            {!loading && deck && <DeckView deck={deck} />}
            <AudioPlayer />
          </AudioPlayerProvider>
        </Layout.Content>
      </Layout>
    </>
  );
};

export default DeckPage;
