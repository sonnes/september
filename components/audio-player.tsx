'use client';

import React, { useEffect, useMemo, useRef } from 'react';

import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline';

import AnimatedText from '@/components/uix/animated-text';

import { useAudioPlayer } from '@/hooks/use-audio-player';

export default function AudioPlayer() {
  const { current, isPlaying, togglePlayPause } = useAudioPlayer();
  const lastTextRef = useRef<string>('');

  const text = useMemo(() => {
    if (current && current.alignment) {
      return current.alignment?.characters.join('') || '';
    }

    return current?.text || '';
  }, [current]);

  // Persist the last non-empty text
  useEffect(() => {
    if (text) {
      lastTextRef.current = text;
    }
  }, [text]);

  const displayText = text || lastTextRef.current;

  return (
    <div className="flex flex-col gap-3 px-2 py-4 bg-zinc-600 rounded-md">
      <div className="flex flex-row items-start justify-between gap-6">
        <div className="flex-1 min-h-0">
          <AnimatedText
            text={displayText}
            speed={200}
            className=" font-semibold text-xl md:text-2xl lg:text-3xl text-zinc-100 leading-relaxed tracking-wide"
          />
        </div>

        <div className="w-8 h-8 shrink-0 mt-1">
          {current && (
            <button
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              disabled={!current}
              className="text-zinc-300 hover:text-white w-full h-full flex items-center justify-center transition-colors"
            >
              {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
