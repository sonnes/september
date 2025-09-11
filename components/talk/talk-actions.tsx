'use client';

import { useState } from 'react';

import Link from 'next/link';

import { Cog6ToothIcon, EyeIcon } from '@heroicons/react/24/outline';

import { TTSSettingsDialog } from '@/components/settings';
import { MobileMessageList } from '@/components/talk';
import MuteButton from '@/components/talk/mute-button';

export function TalkActions() {
  const [isTTSSettingsOpen, setIsTTSSettingsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center space-x-2">
        <MuteButton />
        <MobileMessageList />
        <Link
          href={`/monitor`}
          className="p-2 text-white rounded-full transition-colors cursor-pointer hover:bg-white/10"
          aria-label="Open monitor"
        >
          <EyeIcon className="w-6 h-6" />
        </Link>
        <button
          onClick={() => setIsTTSSettingsOpen(true)}
          className="p-2 text-white rounded-full transition-colors cursor-pointer hover:bg-white/10"
          aria-label="Open TTS settings"
        >
          <Cog6ToothIcon className="w-6 h-6" />
        </button>
      </div>

      <TTSSettingsDialog isOpen={isTTSSettingsOpen} onClose={() => setIsTTSSettingsOpen(false)} />
    </>
  );
}
