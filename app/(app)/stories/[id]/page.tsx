'use client';

import React from 'react';

import { notFound, useParams } from 'next/navigation';

import { useQuery, useQueryOne } from '@triplit/react';

import AudioPlayer from '@/components/audio-player';
import DeckView from '@/components/decks/view';
import Layout from '@/components/layout';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { AudioPlayerProvider } from '@/hooks/use-audio-player';
import { triplit } from '@/triplit/client';
import { Card, Deck } from '@/types/card';

const StoryPage: React.FC = () => {
  const params = useParams();
  const id =
    typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  if (!triplit || !id) notFound();

  const deckQuery = triplit.query('decks').Where('id', '=', id);
  const { result: deck, fetching: loading } = useQueryOne(triplit, deckQuery);

  if (!loading && !deck) notFound();

  const cardsQuery = triplit.query('cards').Where('deck_id', '=', id).Order('rank', 'ASC');
  const { results: cards } = useQuery(triplit, cardsQuery);

  if (deck) (deck as Deck).cards = cards as Card[];

  return (
    <>
      <Layout>
        <Layout.Header>
          <div className="flex flex-col gap-2">
            <Breadcrumbs
              pages={
                deck
                  ? [
                      { name: 'Stories', href: '/stories', current: false },
                      { name: deck.name, href: `/stories/${deck.id}`, current: true },
                    ]
                  : [{ name: 'Stories', href: '/stories', current: true }]
              }
              homeHref="/"
            />
          </div>
        </Layout.Header>
        <Layout.Content>
          <AudioPlayerProvider>
            {loading && <div>Loading deck...</div>}
            {!loading && !deck && <div>Deck not found.</div>}
            {!loading && deck && <DeckView deck={deck} />}
          </AudioPlayerProvider>
        </Layout.Content>
      </Layout>
    </>
  );
};

export default StoryPage;
