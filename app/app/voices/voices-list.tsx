'use client';

import { PlayIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { setVoiceId } from '@/app/actions/account';
import { deleteVoice } from '@/app/actions/voices';
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

  const onDeleteVoice = async (voiceId: string) => {
    if (confirm('Are you sure you want to delete this voice? This action cannot be undone.')) {
      await deleteVoice(voiceId);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 mb-4">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clone Your Voice</h3>
          <Button href="/app/voices/clone" className="w-full" color="indigo">
            Clone Voice &rarr;
          </Button>
        </div>
      </div>

      <ul
        role="list"
        className="divide-y divide-gray-100 bg-white rounded-xl shadow-sm border border-gray-200"
      >
        {voices.map(voice => (
          <li key={voice.voice_id} className="flex items-center justify-between gap-x-6 py-5 px-4">
            <div className="min-w-0">
              <div className="flex items-start gap-x-3">
                <p className="text-sm/6 font-semibold text-gray-900">{voice.name}</p>
                {voice.gender && (
                  <span
                    className={clsx(
                      getGenderStyle(voice.gender),
                      'mt-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset capitalize'
                    )}
                  >
                    {voice.gender}
                  </span>
                )}
                {voice.category === 'cloned' && (
                  <span className="mt-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-600 bg-gray-50 ring-1 ring-inset ring-gray-500/10 capitalize">
                    Cloned
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs/5 text-gray-500">
                {voice.accent && (
                  <span className="whitespace-nowrap capitalize">{voice.accent.toLowerCase()}</span>
                )}
                {voice.age && (
                  <>
                    <svg viewBox="0 0 2 2" className="size-0.5 fill-current">
                      <circle r={1} cx={1} cy={1} />
                    </svg>
                    <span className="whitespace-nowrap capitalize">{voice.age.toLowerCase()}</span>
                  </>
                )}
                {voice.use_case && (
                  <>
                    <svg viewBox="0 0 2 2" className="size-0.5 fill-current">
                      <circle r={1} cx={1} cy={1} />
                    </svg>
                    <span className="whitespace-nowrap capitalize">
                      {voice.use_case.toLowerCase()}
                    </span>
                  </>
                )}
              </div>
              {voice.description && (
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{voice.description}</p>
              )}
            </div>
            <div className="flex flex-none items-center gap-x-4">
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
              {voice.category === 'cloned' && (
                <Button
                  plain
                  onClick={() => onDeleteVoice(voice.voice_id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="h-5 w-5" />
                </Button>
              )}
              {account?.voice_id !== voice.voice_id ? (
                <Button onClick={() => onSelectVoice(voice.voice_id)} className="shrink-0" outline>
                  Use
                </Button>
              ) : (
                <div className="p-2 shrink-0 text-green-600 text-sm">Selected</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
