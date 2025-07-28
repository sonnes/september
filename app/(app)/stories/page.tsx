'use client';

import React, { useState } from 'react';

import Link from 'next/link';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useQuery } from '@triplit/react';

import Layout from '@/components/layout';
import Navbar from '@/components/nav';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { useAccount } from '@/hooks/use-account';
import { triplit } from '@/triplit/client';
import { Deck } from '@/types/card';

import CreateStory from './create-story';

function CreateStoryCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-400 rounded-xl p-6 min-h-[180px] cursor-pointer hover:bg-indigo-50 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label="Create Story"
      type="button"
    >
      <span className="text-5xl text-indigo-400">+</span>
      <span className="mt-2 text-indigo-700 font-medium">Create Story</span>
    </button>
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

export default function StoriesPage() {
  const [showCreate, setShowCreate] = useState(false);
  if (!triplit) {
    return <div>Loading stories...</div>;
  }
  const decksQuery = triplit.query('decks').Order('created_at', 'DESC');
  const { results: decks = [], fetching: loading } = useQuery(triplit, decksQuery);

  const { user } = useAccount({});
  return (
    <Layout>
      <Layout.Header>
        <Navbar user={user} current="/stories" />
        <div className="flex items-center justify-between mb-4">
          <Breadcrumbs
            pages={[{ name: 'Stories', href: '/stories', current: true }]}
            className="md:hidden"
          />
          <h1 className="hidden md:block text-2xl font-bold tracking-tight text-white">Stories</h1>
        </div>
      </Layout.Header>
      <Layout.Content>
        {loading ? (
          <div className="mb-8">Loading stories...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <CreateStoryCard onClick={() => setShowCreate(true)} />
            {decks.map(deck => (
              <StoryCard key={deck.id} deck={deck} />
            ))}
          </div>
        )}
        {/* Modal for Create Story */}
        <Dialog open={showCreate} onClose={() => setShowCreate(false)} className="relative z-50">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
          {/* Centered panel */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl font-bold"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
                type="button"
              >
                ×
              </button>
              <DialogTitle as="h2" className="text-xl font-bold mb-4 text-gray-900">
                Create Story
              </DialogTitle>
              <CreateStory />
            </DialogPanel>
          </div>
        </Dialog>
      </Layout.Content>
    </Layout>
  );
}
