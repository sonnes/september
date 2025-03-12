'use client';

import { ArrowRightIcon, PlayIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { setVoiceId } from '@/app/actions/account';
import { Button } from '@/components/catalyst/button';
import { useAccount } from '@/components/context/auth';
import type { Voice } from '@/types/speech';

export default function VoicesList({ voices }: { voices: Voice[] }) {
  const { account, setAccount } = useAccount();

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

  const onSelectVoice = (voiceId: string) => {
    setVoiceId(voiceId);
    setAccount({ ...account, voice_id: voiceId });
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200 flex flex-col items-center justify-center p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clone Your Voice</h3>
          <Button href="/app/voices/clone" className="w-full" color="indigo">
            Clone <ArrowRightIcon className="w-4 h-4" />
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
                  {voice.gender && (
                    <span
                      className={clsx(
                        getGenderStyle(voice.gender),
                        'inline-block mt-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize'
                      )}
                    >
                      {voice.gender}
                    </span>
                  )}
                </div>
                {voice.preview_url && (
                  <Button
                    plain
                    onClick={() => {
                      const audio = new Audio(voice.preview_url);
                      audio.play();
                    }}
                  >
                    <PlayIcon className="h-5 w-5 text-gray-600" />
                  </Button>
                )}
                {account?.voice_id !== voice.voice_id ? (
                  <Button
                    onClick={() => onSelectVoice(voice.voice_id)}
                    className="shrink-0"
                    outline
                  >
                    Use
                  </Button>
                ) : (
                  <div className="p-2 shrink-0 text-green-600 text-sm">Selected</div>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {voice.accent && (
                  <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 capitalize">
                    {voice.accent.toLowerCase()}
                  </span>
                )}
                {voice.age && (
                  <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 capitalize">
                    {voice.age.toLowerCase()}
                  </span>
                )}
                {voice.use_case && (
                  <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 capitalize">
                    {voice.use_case.toLowerCase()}
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
