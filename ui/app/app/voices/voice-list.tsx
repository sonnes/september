'use client';

import { Menu } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';
import type { LibraryVoiceResponse } from 'elevenlabs/api/types/index';

import { setVoiceId } from '@/app/app/account/actions';

interface VoiceListProps {
  voices: LibraryVoiceResponse[];
  has_more: boolean;
  last_sort_id?: string;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

function VoiceListItem({ voice }: { voice: LibraryVoiceResponse }) {
  return (
    <li className="flex items-center justify-between gap-x-6 py-5">
      <div className="min-w-0">
        <div className="flex items-start gap-x-3">
          <p className="text-sm/6 font-semibold text-gray-900">{voice.name}</p>
          <p
            className={classNames(
              'mt-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
              'text-blue-700 bg-blue-50 ring-blue-600/20'
            )}
          >
            {voice.category}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-x-2 text-xs/5 text-gray-500">
          <p className="truncate">{voice.description}</p>
        </div>
      </div>
      <div className="flex flex-none items-center gap-x-4">
        <button
          onClick={() => setVoiceId(voice.voice_id)}
          className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Use<span className="sr-only">, {voice.name}</span>
        </button>
      </div>
    </li>
  );
}

export default function VoiceList({ voices }: VoiceListProps) {
  return (
    <ul role="list" className="divide-y divide-gray-100">
      {voices.map(voice => (
        <VoiceListItem key={voice.voice_id} voice={voice} />
      ))}
    </ul>
  );
}
