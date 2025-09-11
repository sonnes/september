'use client';

import React, { useEffect, useState } from 'react';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';

import { useAudioPlayer } from '@/hooks/use-audio-player';
import DecksService from '@/services/decks';
import MessagesService from '@/services/messages/messages';
import { useSpeech } from '@/services/speech/use-speech';
import supabase from '@/supabase/client';
import { Card, Deck } from '@/types/deck';

interface DeckViewProps {
  deck: Deck;
}

const DeckView: React.FC<DeckViewProps> = ({ deck: initialDeck }) => {
  const [deck, setDeck] = useState(initialDeck);

  const [current, setCurrent] = useState(0);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const decksService = new DecksService(supabase);
  const messagesService = new MessagesService(supabase);
  const { generateSpeech } = useSpeech();
  const { enqueue, isPlaying, togglePlayPause } = useAudioPlayer();

  const cards = deck.cards;

  const downloadAudio = async (path: string) => {
    const { data, error } = await supabase.storage.from('audio').download(path);
    if (error || !data) {
      console.error('Error downloading audio:', error);

      return;
    }
    return data;
  };

  useEffect(() => {
    if (!cards?.length) return;

    const loadAudio = async () => {
      for (const card of cards) {
        if (card.audio) {
          enqueue(card.audio);
        } else if (card.audio_path) {
          const audioData = await downloadAudio(card.audio_path);
          if (audioData) {
            enqueue({
              path: card.audio_path,
              blob: Buffer.from(await audioData.arrayBuffer()).toString('base64'),
            });
          }
        }
      }
    };

    loadAudio();
  }, [cards, enqueue]);

  if (!cards?.length) return null;

  const handlePrev = () => {
    setCurrent(c => (c === 0 ? cards.length - 1 : c - 1));
  };
  const handleNext = () => {
    setCurrent(c => (c === cards.length - 1 ? 0 : c + 1));
  };

  const handleGenerateNarration = async () => {
    setIsGeneratingAudio(true);
    try {
      const cardsWithAudio = await Promise.all(
        cards.map(async card => {
          // 1. Generate narration
          const speechAudio = await generateSpeech(card.text);

          // 2. Upload audio
          const audioPath = `${card.id}.mp3`;
          await messagesService.uploadAudio({
            path: audioPath,
            blob: speechAudio.blob,
            alignment: speechAudio.alignment,
          });

          // 3. Update card with audio path
          return { ...card, audio_path: audioPath };
        })
      );

      await decksService.putCards(cardsWithAudio);

      setDeck({ ...deck, cards: cardsWithAudio });
    } catch (error) {
      console.error('Error generating audio:', error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  return (
    <div className="bg-zinc-50 py-4 sm:py-8">
      <div className="mx-auto px-6 lg:px-8">
        <div className="mx-auto mt-2 flex items-center justify-center gap-4">
          <span className="text-balance text-center text-2xl font-semibold tracking-tight text-zinc-950 lg:text-3xl">
            {deck.name}
          </span>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGenerateNarration}
            disabled={isGeneratingAudio}
            type="button"
          >
            <SpeakerWaveIcon className="w-5 h-5" />
            {isGeneratingAudio ? 'Generating...' : 'Generate Audio'}
          </button>
        </div>
        <div className="mt-12 flex flex-col items-center justify-center min-h-[400px]">
          <CardStack cards={cards} current={current} />
          {/* Controls below card */}
          <div className="flex justify-center gap-8 mt-8">
            <button
              className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-200 hover:bg-zinc-300 transition-colors"
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
              className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-200 hover:bg-zinc-300 transition-colors"
              onClick={handleNext}
              aria-label="Next"
              type="button"
            >
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="mt-4 text-zinc-600 text-sm">
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
    className={`relative flex items-center justify-center w-full h-full overflow-hidden rounded-2xl transition-all duration-300 bg-white shadow-md border border-zinc-200`}
  >
    <div className="flex flex-col h-full w-full items-center justify-center px-4 sm:px-12 py-10 rounded-2xl">
      <p className="text-xl lg:text-2xl font-medium text-zinc-800 text-center mb-6 break-words">
        {cleanText(card.text)}
      </p>

      <div className="absolute bottom-2 right-2 flex items-center justify-center">
        <span className="text-base font-semibold text-zinc-400 bg-white bg-opacity-70 px-2 py-0.5 rounded shadow-none">
          #{card.rank + 1}
        </span>
      </div>
    </div>
  </div>
);

export default DeckView;
