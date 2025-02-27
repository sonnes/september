'use client';

import { useEffect } from 'react';

import Waveform from '@/app/app/talk/waveform';
import { Heading } from '@/components/catalyst/heading';
import { usePlayer } from '@/components/context/player';

export function Player() {
  const { playing, audio } = usePlayer();

  useEffect(() => {
    if (!audio) return;

    audio.play();
  }, [audio]);

  return (
    <div className="relative min-h-[3rem] w-full">
      <div className="absolute inset-0">
        <Waveform />
      </div>
      <div className="relative">
        <Heading level={2} className="text-zinc-900 mix-blend-darken">
          {playing?.text}
        </Heading>
      </div>
    </div>
  );
}
