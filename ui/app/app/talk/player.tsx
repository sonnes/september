'use client';

import { Heading } from '@/components/catalyst/heading';
import Waveform from '@/components/waveform';

export function Player() {
  return (
    <div>
      <div className="flex-1 min-w-0">
        <Heading level={2} className="text-zinc-900 dark:text-white truncate"></Heading>
      </div>
      <div className="flex items-center gap-4 shrink-0"></div>
    </div>
  );
}
