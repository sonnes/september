'use client';

import React from 'react';

import { notFound, useParams } from 'next/navigation';

import AudioPlayer from '@/components/audio-player';
import DeckView from '@/components/deck/view';
import Layout from '@/components/layout';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { AudioPlayerProvider } from '@/hooks/use-audio-player';
import { useDeck } from '@/hooks/use-decks';

const StoryPage: React.FC = () => {
  const params = useParams();
  const id =
    typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const [deck, loading] = useDeck(id);
  if (!loading && !deck) notFound();

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
            <AudioPlayer />
          </AudioPlayerProvider>
        </Layout.Content>
      </Layout>
    </>
  );
};

export default StoryPage;
