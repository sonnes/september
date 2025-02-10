'use client';

import { useEffect } from 'react';

import { Heading } from '@/components/catalyst/heading';
import { usePlayer } from '@/components/context/player';

export function Player() {
  const { playing, audio } = usePlayer();

  useEffect(() => {
    if (!audio) return;

    audio.play();
  }, [audio]);

  return (
    <div>
      <div className="flex-1 min-w-0">
        <Heading level={2} className="text-zinc-900 dark:text-white truncate">
          {playing?.text}
        </Heading>
      </div>
      <div className="flex items-center gap-4 shrink-0"></div>
    </div>
  );
}
