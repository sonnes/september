import React from 'react';

import { TextCard } from '@/types/card';

type CardsListProps = {
  cards: TextCard[];
};

const CardsList: React.FC<CardsListProps> = ({ cards }) => {
  if (!cards.length) return null;

  return (
    <div className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
        <h2 className="text-center text-base/7 font-semibold text-indigo-600">Extracted Text</h2>
        <p className="mx-auto mt-2 max-w-lg text-balance text-center text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
          Your processed documents
        </p>
        <div className="mt-10 grid gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(card => (
            <div key={card.id} className="relative">
              <div className="absolute inset-px rounded-lg bg-white" />
              <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.lg)+1px)]">
                <div className="px-8 pb-3 pt-8 sm:px-10 sm:pb-0 sm:pt-10">
                  <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">
                    Card #{card.rank}
                  </p>
                  <p className="mt-2 text-sm/6 text-gray-600 line-clamp-3">{card.text}</p>
                </div>
                <div className="flex flex-1 flex-col justify-between px-8 max-lg:pb-12 max-lg:pt-10 sm:px-10 lg:pb-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{card.createdAt.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      disabled
                    >
                      ▶️ Play (coming soon)
                    </button>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-px rounded-lg shadow outline outline-black/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CardsList;
