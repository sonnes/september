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
    <div className="flex flex-col gap-3 px-2 h-12">
      <div className="flex flex-row items-center justify-between gap-2 h-full">
        <div className="flex-1 min-h-0">
          <AnimatedText
            text={text}
            speed={200}
            className="text-sm md:text-base lg:text-lg font-semibold text-zinc-700 leading-relaxed"
          />
        </div>

        <div className="w-6 h-6 shrink-0">
          {current && (
            <button
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              disabled={!current}
              className="text-zinc-900 hover:text-zinc-800 w-full h-full flex items-center justify-center"
            >
              {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
