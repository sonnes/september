'use client';

import React, { useMemo } from 'react';

import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline';

import AnimatedText from '@/components/ui/animated-text';

import { useAudioPlayer } from '@/hooks/use-audio-player';

export default function AudioPlayer() {
  const { current, isPlaying, togglePlayPause } = useAudioPlayer();

  const text = useMemo(() => {
    if (current && current.alignment) {
      return current.alignment?.characters.join('') || '';
    }

    return current?.text || '';
  }, [current]);

  return (
    <div className="flex flex-col gap-3 px-2">
      <div className="flex flex-row items-start justify-between gap-2">
        <div className="flex-1">
          <AnimatedText
            text={text}
            speed={200}
            className="text-sm md:text-base lg:text-lg font-semibold text-zinc-700 leading-relaxed"
          />
        </div>

        {current && (
          <button
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={!current}
            className="text-zinc-900 hover:text-zinc-800 flex-shrink-0"
          >
            {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
          </button>
        )}
      </div>
    </div>
  );
}
