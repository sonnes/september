'use client';

import { PlayCircleIcon } from '@heroicons/react/24/outline';

import { usePlayer } from '@/components/context/player';

export function PlayButton({ id, text }: { id: string; text: string }) {
  const { setPlaying } = usePlayer();
  return (
    <button
      className="ml-2 p-1 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      aria-label="Play message"
      onClick={() => setPlaying({ id, text })}
    >
      <PlayCircleIcon className="h-6 w-6" />
    </button>
  );
}
