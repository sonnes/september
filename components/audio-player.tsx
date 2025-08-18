'use client';

import React from 'react';

import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline';

import { useAudioPlayer } from '@/hooks/use-audio-player';

export default function AudioPlayer() {
  const { current, isPlaying, togglePlayPause } = useAudioPlayer();

  return (
    <div className="px-4 flex flex-row gap-3">
      {current && (
        <button
          onClick={togglePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          disabled={!current}
          className="text-zinc-900 hover:text-zinc-800 justify-end"
        >
          {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
        </button>
      )}
    </div>
  );
}
