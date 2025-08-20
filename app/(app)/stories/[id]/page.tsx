import React from 'react';

import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { AccountProvider } from '@/components/context/account-provider';
import DeckView from '@/components/decks/view';
import Layout from '@/components/layout';
import Navbar from '@/components/nav';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { AudioPlayerProvider } from '@/hooks/use-audio-player';
import AccountsService from '@/services/accounts';
import DecksService from '@/services/decks';
import { createClient } from '@/supabase/server';

export const metadata: Metadata = {
  title: 'Story - September',
};

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);
  const decksService = new DecksService(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [account, deck] = await Promise.all([
    accountsService.getAccount(user.id),
    decksService.getDeckWithCards(id),
  ]);

  if (!deck) {
    notFound();
  }

  return (
    <AccountProvider user={user} account={account}>
      <Layout>
        <Layout.Header>
          <Navbar user={user} current={`/stories/${deck.id}`} />
          <div className="flex items-center justify-between mb-4">
            <Breadcrumbs
              pages={
                deck
                  ? [
                      { name: 'Stories', href: '/stories', current: false },
                      { name: deck.name, href: `/stories/${deck.id}`, current: true },
                    ]
                  : [{ name: 'Stories', href: '/stories', current: true }]
              }
              className="md:hidden"
            />
            <h1 className="hidden md:block text-2xl font-bold tracking-tight text-white">
              Stories
            </h1>
          </div>
        </Layout.Header>
        <Layout.Content>
          <AudioPlayerProvider>
            <DeckView deck={deck} />
          </AudioPlayerProvider>
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
