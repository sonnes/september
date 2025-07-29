'use client';

import React from 'react';

import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline';

import { useAudioPlayer } from '@/hooks/use-audio-player';

export default function AudioPlayer() {
  const { current, isPlaying, togglePlayPause } = useAudioPlayer();

  // Helper to render aligned text with words grouped
  function renderAlignedText() {
    if (!current?.alignment && !isPlaying) return '...';
    if (!current?.alignment && isPlaying) return 'Playing audio...';
    const { characters } = current?.alignment || { characters: [] };

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
    <div className="px-4 flex flex-row justify-between items-center gap-3 text-white">
      <div className="flex-1 font-medium text-sm text-center truncate">{renderAlignedText()}</div>
      <button
        onClick={togglePlayPause}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        disabled={!current}
        className="text-white hover:text-white/80"
      >
        {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
      </button>
    </div>
  );
}
