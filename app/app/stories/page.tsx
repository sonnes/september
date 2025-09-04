import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PlusIcon } from '@heroicons/react/24/outline';

import Layout from '@/components/layout';
import Navbar from '@/components/nav';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { AccountProvider } from '@/services/account/context';
import AccountsService from '@/services/accounts';
import DecksService from '@/services/decks';
import { createClient } from '@/supabase/server';
import { Deck } from '@/types/deck';

export const metadata: Metadata = {
  title: 'Stories - September',
};

function CreateStoryCard() {
  return (
    <Link href="/stories/create" className="block">
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-5 min-h-[180px] flex flex-col items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-colors">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
            <PlusIcon className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="text-center">
            <h2 className="font-semibold text-gray-900">Create Story</h2>
            <p className="text-sm text-gray-500 mt-1">Start a new story</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function StoryCard({ deck }: { deck: Deck }) {
  return (
    <Link href={`/stories/${deck.id}`} className="block">
      <div className="rounded-xl bg-white shadow p-5 min-h-[180px] flex flex-col justify-between hover:shadow-lg transition">
        <div>
          <h2 className="font-bold text-lg text-gray-900 truncate">{deck.name}</h2>
          <p className="text-gray-500 text-sm mt-1">
            Created: {new Date(deck.created_at).toLocaleDateString()}
          </p>
        </div>
        <span className="mt-4 text-indigo-500 font-semibold text-sm">View Story →</span>
      </div>
    </Link>
  );
}

export default async function StoriesPage() {
  const supabase = await createClient();
  const accountsService = new AccountsService(supabase);
  const decksService = new DecksService(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [account, decks] = await Promise.all([
    accountsService.getAccount(user.id),
    decksService.getDecks(user.id),
  ]);

  return (
    <AccountProvider user={user} account={account}>
      <Layout>
        <Layout.Header>
          <Navbar user={user} current="/stories" />
          <div className="flex items-center justify-between mb-4">
            <Breadcrumbs
              pages={[{ name: 'Stories', href: '/stories', current: true }]}
              className="md:hidden"
            />
            <h1 className="hidden md:block text-2xl font-bold tracking-tight text-white">
              Stories
            </h1>
          </div>
        </Layout.Header>
        <Layout.Content>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <CreateStoryCard />
            {decks.map(deck => (
              <StoryCard key={deck.id} deck={deck} />
            ))}
          </div>
        </Layout.Content>
      </Layout>
    </AccountProvider>
  );
}
