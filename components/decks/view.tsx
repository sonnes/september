import React, { useEffect, useState } from 'react';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

import { useAudioPlayer } from '@/hooks/use-audio-player';
import { Card, Deck } from '@/types/card';

interface DeckViewProps {
  deck: Deck;
}

const DeckView: React.FC<DeckViewProps> = ({ deck }) => {
  const cards = deck.cards;
  const [current, setCurrent] = useState(0);
  const { enqueue, isPlaying, togglePlayPause, current: currentAudio } = useAudioPlayer();

  if (!cards?.length) return null;

  useEffect(() => {
    cards.forEach(card => {
      if (card.audio) {
        enqueue(card.audio);
      }
    });
  }, [cards, enqueue]);

  const handlePrev = () => {
    setCurrent(c => (c === 0 ? cards.length - 1 : c - 1));
  };
  const handleNext = () => {
    setCurrent(c => (c === cards.length - 1 ? 0 : c + 1));
  };

  return (
    <div className="bg-gray-50 py-4 sm:py-8">
      <div className="mx-auto px-6 lg:px-8">
        <div className="mx-auto mt-2 flex items-center justify-center gap-2">
          <span className="text-balance text-center text-2xl font-semibold tracking-tight text-gray-950 lg:text-3xl">
            {deck.name}
          </span>
        </div>
        <div className="mt-12 flex flex-col items-center justify-center min-h-[400px]">
          <CardStack cards={cards} current={current} />
          {/* Controls below card */}
          <div className="flex justify-center gap-8 mt-8">
            <button
              className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
              onClick={handlePrev}
              aria-label="Previous"
              type="button"
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <button
              className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg"
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              type="button"
              disabled={!cards[current].audio}
            >
              {isPlaying ? <PauseIcon className="w-7 h-7" /> : <PlayIcon className="w-7 h-7" />}
            </button>
            <button
              className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
              onClick={handleNext}
              aria-label="Next"
              type="button"
            >
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="mt-4 text-gray-600 text-sm">
            {current + 1} / {cards.length}
          </div>
        </div>
      </div>
    </div>
  );
};

interface CardStackProps {
  cards: Card[];
  current: number;
  className?: string;
}

const CardStack: React.FC<CardStackProps> = ({ cards, current, className }) => (
  <div
    className={`w-full max-w-xl flex items-center justify-center select-none ${className || ''}`}
  >
    <div className="w-full transition-all duration-300">
      <CardDisplay card={cards[current]} />
    </div>
  </div>
);

function cleanText(text: string) {
  // remove all tags like <pause> and <effect> containing text
  return text
    .replace(/<pause.*?>|<pause.*?>.*?<\/pause>|<effect.*?>.*?<\/effect>/g, ' ')
    .replace(/<.*?>/g, '')
    .trim();
}

interface CardDisplayProps {
  card: Card;
  size?: 'center' | 'side';
}

const CardDisplay: React.FC<CardDisplayProps> = ({ card }) => (
  <div
    className={`relative flex items-center justify-center w-full h-full overflow-hidden rounded-2xl transition-all duration-300 bg-white shadow-md border border-gray-200`}
  >
    <div className="flex flex-col h-full w-full items-center justify-center px-4 sm:px-12 py-10 rounded-2xl">
      <p className="text-xl lg:text-2xl font-medium text-gray-800 text-center mb-6 break-words">
        {cleanText(card.text)}
      </p>

      <div className="absolute bottom-2 right-2 flex items-center justify-center">
        <span className="text-base font-semibold text-gray-400 bg-white bg-opacity-70 px-2 py-0.5 rounded shadow-none">
          #{card.rank + 1}
        </span>
      </div>
    </div>
  </div>
);

export default DeckView;
