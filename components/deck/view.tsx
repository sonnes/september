import React, { useEffect, useRef, useState } from 'react';

import { Card, Deck } from '@/types/card';

interface DeckViewProps {
  deck: Deck;
}

const DeckView: React.FC<DeckViewProps> = ({ deck }) => {
  const [current, setCurrent] = useState(0);
  const cards = deck.cards;
  if (!cards?.length) return null;

  const prev = () => setCurrent(c => (c === 0 ? cards.length - 1 : c - 1));
  const next = () => setCurrent(c => (c === cards.length - 1 ? 0 : c + 1));

  // Swipe/touch support
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const cardAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cardArea = cardAreaRef.current;
    if (!cardArea) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchMove = (e: TouchEvent) => {
      touchEndX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = () => {
      if (touchStartX.current !== null && touchEndX.current !== null) {
        const deltaX = touchEndX.current - touchStartX.current;
        if (Math.abs(deltaX) > 50) {
          if (deltaX < 0)
            next(); // swipe left
          else prev(); // swipe right
        }
      }
      touchStartX.current = null;
      touchEndX.current = null;
    };
    cardArea.addEventListener('touchstart', handleTouchStart);
    cardArea.addEventListener('touchmove', handleTouchMove);
    cardArea.addEventListener('touchend', handleTouchEnd);
    return () => {
      cardArea.removeEventListener('touchstart', handleTouchStart);
      cardArea.removeEventListener('touchmove', handleTouchMove);
      cardArea.removeEventListener('touchend', handleTouchEnd);
    };
  }, [cards.length]);

  return (
    <div className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto px-6 lg:px-8">
        <h2 className="text-center text-base/7 font-semibold text-indigo-600">Deck</h2>
        <p className="mx-auto mt-2 max-w-lg text-balance text-center text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
          {deck.name}
        </p>
        <div className="relative mt-10 flex flex-col items-center justify-center">
          {/* Simple carousel: only show current card */}
          <div
            className="overflow-hidden flex items-center justify-center w-full"
            ref={cardAreaRef}
            style={{ touchAction: 'pan-y' }}
          >
            <div className="w-full h-full">
              <CardDisplay card={cards[current]} />
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-6">
            <button
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              onClick={prev}
            >
              Previous
            </button>
            <span className="text-gray-600 self-center">
              {current + 1} / {cards.length}
            </span>
            <button
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              onClick={next}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CardDisplayProps {
  card: Card;
}

const CardDisplay: React.FC<CardDisplayProps> = ({ card }) => (
  <div
    className="relative flex items-center justify-center w-full h-full overflow-hidden rounded-2xl"
    style={{ width: '100%', height: '100%' }}
  >
    <div className="absolute inset-0 rounded-2xl bg-white shadow-lg border border-gray-200" />
    <div className="relative flex flex-col h-full w-full items-center justify-center px-4 sm:px-12 py-10 rounded-2xl">
      <p className="text-2xl font-bold text-indigo-700 mb-2">Card #{card.rank}</p>
      <p className="text-xl text-gray-800 text-center mb-6 break-words line-clamp-6">{card.text}</p>
      <div className="flex flex-col items-center mt-auto w-full">
        <span className="text-base text-gray-500 mb-4">{card.created_at.toLocaleString()}</span>
        <button
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-lg font-semibold"
          disabled
        >
          ▶️ Play (coming soon)
        </button>
      </div>
    </div>
    {/* Removed extra outline/shadow layer for cleaner look */}
  </div>
);

export default DeckView;
