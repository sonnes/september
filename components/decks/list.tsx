'use client';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';

import {
  AcademicCapIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  ClockIcon,
  ReceiptRefundIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

import { triplit } from '@/triplit/client';
import { Deck } from '@/types/deck';

const icons = [
  ClockIcon,
  CheckBadgeIcon,
  UsersIcon,
  BanknotesIcon,
  ReceiptRefundIcon,
  AcademicCapIcon,
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const DecksList: React.FC = () => {
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

  if (loading) return <div className="mb-8">Loading decks...</div>;
  if (!decks.length) return <div className="mb-8">No decks found.</div>;

  return (
    <div className="mb-8 divide-y divide-zinc-200 overflow-hidden rounded-lg bg-zinc-200 shadow sm:grid sm:grid-cols-2 sm:gap-px sm:divide-y-0">
      {decks.map((deck, idx) => {
        const Icon = icons[idx % icons.length];
        return (
          <Link href={`/read/${deck.id}`} key={deck.id}>
            <div
              className={classNames(
                idx === 0 ? 'rounded-tl-lg rounded-tr-lg sm:rounded-tr-none' : '',
                idx === 1 ? 'sm:rounded-tr-lg' : '',
                idx === decks.length - 2 ? 'sm:rounded-bl-lg' : '',
                idx === decks.length - 1 ? 'rounded-bl-lg rounded-br-lg sm:rounded-bl-none' : '',
                'group relative bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500'
              )}
            >
              <div>
                <span
                  className={classNames(
                    'bg-indigo-50',
                    'text-indigo-700',
                    'inline-flex rounded-lg p-3 ring-4 ring-white'
                  )}
                >
                  <Icon aria-hidden="true" className="size-6" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-base font-semibold text-zinc-900">
                  <span aria-hidden="true" className="absolute inset-0" />
                  {deck.name}
                </h3>
                <p className="mt-2 text-sm text-zinc-500">Deck ID: {deck.id}</p>
              </div>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-6 top-6 text-zinc-300 group-hover:text-zinc-400"
              >
                <svg fill="currentColor" viewBox="0 0 24 24" className="size-6">
                  <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                </svg>
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default DecksList;
