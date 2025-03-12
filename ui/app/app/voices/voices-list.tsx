'use client';

import { PlayIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { Button } from '@/components/catalyst/button';
import type { Voice } from '@/types/speech';

export default function VoicesList({ voices }: { voices: Voice[] }) {
  // Get gender style based on gender value
  const getGenderStyle = (gender?: string) => {
    if (!gender) return 'text-gray-600 bg-gray-50 ring-gray-500/10';

    const styles: Record<string, string> = {
      male: 'text-blue-700 bg-blue-50 ring-blue-600/20',
      female: 'text-pink-700 bg-pink-50 ring-pink-600/20',
      neutral: 'text-purple-700 bg-purple-50 ring-purple-600/20',
    };

    return styles[gender.toLowerCase()] || 'text-gray-600 bg-gray-50 ring-gray-500/10';
  };
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200 flex flex-col items-center justify-center p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Voice</h3>
          <Button href="/app/voices/clone" className="w-full">
            Clone Voice
          </Button>
        </div>
        {voices.map(voice => (
          <div
            key={voice.voice_id}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200"
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{voice.name}</h3>
                  {voice.labels?.['gender'] && (
                    <span
                      className={clsx(
                        getGenderStyle(voice.labels['gender']),
                        'inline-block mt-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset'
                      )}
                    >
                      {voice.labels['gender']}
                    </span>
                  )}
                </div>
                {voice.preview_url && (
                  <button
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => {
                      const audio = new Audio(voice.preview_url);
                      audio.play();
                    }}
                  >
                    <PlayIcon className="h-6 w-6 text-gray-600 hover:text-gray-900" />
                    <span className="sr-only">Play {voice.name}</span>
                  </button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {voice.labels?.['accent'] && (
                  <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                    {voice.labels['accent'].toLowerCase()}
                  </span>
                )}
                {voice.labels?.['age'] && (
                  <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                    {voice.labels['age'].toLowerCase()}
                  </span>
                )}
                {voice.labels?.['use_case'] && (
                  <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                    {voice.labels['use_case'].toLowerCase()}
                  </span>
                )}
              </div>

              {voice.description && (
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{voice.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
