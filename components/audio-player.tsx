'use client';

import React from 'react';

import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { useAudioPlayer } from '@/hooks/use-audio-player';

export default function AudioPlayer() {
  const { current, isPlaying, pause, resume, getCurrentTime } = useAudioPlayer();

  // Helper to render aligned text with words grouped
  function renderAlignedText() {
    if (!current?.alignment) return current ? 'Playing audio...' : 'No audio loaded';
    const { characters } = current.alignment;

    // Group characters into words
    const words = [];
    let word = '';
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      if (char === ' ') {
        if (word.length > 0) {
          words.push(word);
          word = '';
        }
        words.push(' '); // preserve spaces
      } else {
        word += char;
      }
    }
    if (word.length > 0) words.push(word);

    return (
      <span>
        {words.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </span>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-full px-6 py-3 flex flex-row justify-between items-center gap-4 z-50 border border-zinc-300 min-w-[280px] w-full max-w-lg">
      <div className="flex-1 text-zinc-900 font-medium text-base text-center truncate max-w-xs mx-auto">
        {renderAlignedText()}
      </div>
      <Button
        onClick={current ? (isPlaying ? pause : resume) : undefined}
        color="zinc"
        variant="circular"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        icon={isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
        disabled={!current}
        className="flex-shrink-0"
      />
    </div>
  );
}
