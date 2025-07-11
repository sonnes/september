import React, { useEffect, useRef, useState } from 'react';

import { PlayIcon } from '@heroicons/react/24/outline';

import { useAudioPlayer } from '@/hooks/use-audio-player';
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

  const { enqueue } = useAudioPlayer();

  const playAll = () => {
    cards.forEach(card => {
      if (card.audio) {
        enqueue(card.audio);
      }
    });
  };

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

  // Carousel indices
  const prevIdx = current === 0 ? undefined : current - 1;
  const nextIdx = current === cards.length - 1 ? undefined : current + 1;

  return (
    <div className="bg-gray-50 py-12 sm:py-18">
      <div className="mx-auto px-6 lg:px-8">
        <h2 className="text-center text-base/7 font-semibold text-indigo-600">Story</h2>
        <div className="mx-auto mt-2 flex items-center justify-center gap-2">
          <span className="text-balance text-center text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
            {deck.name}
          </span>
          <button
            className="ml-2 align-middle text-2xl hover:text-indigo-600 transition-colors"
            onClick={playAll}
            aria-label="Play All"
            title="Play All"
            type="button"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              lineHeight: 1,
              display: 'inline',
              verticalAlign: 'middle',
              cursor: 'pointer',
            }}
          >
            <PlayIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="relative mt-10 flex flex-col items-center justify-center">
          {/* Center mode carousel */}
          <div
            className="overflow-x-hidden flex items-center justify-center w-full"
            ref={cardAreaRef}
            style={{ touchAction: 'pan-y' }}
          >
            <div
              className="flex items-center justify-center w-full gap-2 sm:gap-6"
              style={{ maxWidth: 900 }}
            >
              {/* Previous card (hidden on mobile) */}
              {prevIdx !== undefined && (
                <div
                  className="hidden sm:block flex-shrink-0 cursor-pointer"
                  style={{ width: '28%', opacity: 0.5, transform: 'scale(0.85)' }}
                  onClick={prev}
                  tabIndex={0}
                  role="button"
                  aria-label="Previous card"
                >
                  <CardDisplay card={cards[prevIdx]} />
                </div>
              )}
              {/* Current card */}
              <div className="flex-shrink-0 z-10" style={{ width: '90%', transform: 'scale(1)' }}>
                <CardDisplay card={cards[current]} />
              </div>
              {/* Next card (hidden on mobile) */}
              {nextIdx !== undefined && (
                <div
                  className="hidden sm:block flex-shrink-0 cursor-pointer"
                  style={{ width: '28%', opacity: 0.5, transform: 'scale(0.85)' }}
                  onClick={next}
                  tabIndex={0}
                  role="button"
                  aria-label="Next card"
                >
                  <CardDisplay card={cards[nextIdx]} />
                </div>
              )}
            </div>
          </div>
          {/* Navigation buttons */}
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
  size?: 'center' | 'side';
}

const CardDisplay: React.FC<CardDisplayProps> = ({ card }) => (
  <div
    className={`relative flex items-center justify-center w-full h-full overflow-hidden rounded-2xl transition-all duration-300`}
  >
    <div className="absolute inset-0 rounded-2xl bg-white shadow-lg border border-gray-200" />
    <div className="relative flex flex-col h-full w-full items-center justify-center px-4 sm:px-12 py-10 rounded-2xl">
      {/* Card number in top right using flex */}
      <div className="flex w-full justify-end mb-2">
        <span className="text-base font-semibold text-gray-400 bg-white bg-opacity-70 px-2 py-0.5 rounded shadow-none">
          #{card.rank + 1}
        </span>
      </div>
      <p className="text-3xl font-medium text-gray-800 text-center mb-6 break-words">{card.text}</p>
    </div>
  </div>
);

export default DeckView;
