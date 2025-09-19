'use client';

import Link from 'next/link';

import { EyeIcon } from '@heroicons/react/24/outline';

import { MobileMessageList } from '@/components/talk';
import MuteButton from '@/components/talk/mute-button';

import Recorder from './recorder';

export function TalkActions() {
  return (
    <div className="flex items-center space-x-2">
      <Recorder />
      <MuteButton />
      <MobileMessageList />
      <Link
        href={`/monitor`}
        className="p-2 text-white rounded-full transition-colors cursor-pointer hover:bg-white/10"
        aria-label="Open monitor"
      >
        <EyeIcon className="w-6 h-6" />
      </Link>
    </div>
  );
}
