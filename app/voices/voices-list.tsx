'use client';

import { useEffect, useState } from 'react';

import { PlayIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { Button } from '@/components/ui/button';

import { useAccount } from '@/services/account/context';
import { useSpeechContext } from '@/services/speech/context';

import type { Voice } from '@/types/voice';

export default function VoicesList({ search }: { search?: string }) {
  const { account, updateAccount } = useAccount();
  const { listVoices } = useSpeechContext();

  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch voices using the speech service
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setLoading(true);
        setError(null);

        const speechVoices = await listVoices({ search });

        setVoices(speechVoices);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch voices');
        console.error('Error fetching voices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();
  }, [listVoices, search]);

  // Get gender style based on gender value
  const getGenderStyle = (gender?: string) => {
    if (!gender) return 'text-zinc-600 bg-zinc-50 ring-zinc-500/10';

    const styles: Record<string, string> = {
      male: 'text-indigo-700 bg-indigo-50 ring-indigo-600/20',
      female: 'text-indigo-700 bg-indigo-50 ring-indigo-600/20',
      neutral: 'text-indigo-700 bg-indigo-50 ring-indigo-600/20',
    };

    return styles[gender.toLowerCase()] || 'text-zinc-600 bg-zinc-50 ring-zinc-500/10';
  };

  const onSelectVoice = async (voice: Voice) => {
    await updateAccount({ voice: { id: voice.id, name: voice.name, language: voice.language } });
  };

  if (!account) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-zinc-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Loading voices...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-zinc-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Loading voices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-indigo-200 p-8 text-center">
          <p className="text-indigo-600">Error loading voices: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {voices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-zinc-200 p-8 text-center">
          <p className="text-zinc-600">
            No voices found. Try adjusting your search or check your API configuration.
          </p>
        </div>
      ) : (
        <ul
          role="list"
          className="divide-y divide-zinc-100 bg-white rounded-xl shadow-sm border border-zinc-200"
        >
          {voices.map(voice => (
            <li key={voice.id} className="flex items-center justify-between gap-x-6 py-5 px-4">
              <div className="min-w-0">
                <div className="flex items-start gap-x-3">
                  <p className="text-sm/6 font-semibold text-zinc-900">{voice.name}</p>
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
                    <span className="mt-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium text-zinc-600 bg-zinc-50 ring-1 ring-inset ring-zinc-500/10 capitalize">
                      Cloned
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs/5 text-zinc-500">
                  {voice.accent && (
                    <span className="whitespace-nowrap capitalize">
                      {voice.accent.toLowerCase()}
                    </span>
                  )}
                  {voice.age && (
                    <>
                      <svg viewBox="0 0 2 2" className="size-0.5 fill-current">
                        <circle r={1} cx={1} cy={1} />
                      </svg>
                      <span className="whitespace-nowrap capitalize">
                        {voice.age.toLowerCase()}
                      </span>
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
                  <p className="mt-2 text-sm text-zinc-500 line-clamp-2">{voice.description}</p>
                )}
              </div>
              <div className="flex flex-none items-center gap-x-4">
                {voice.preview_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const audio = new Audio(voice.preview_url);
                      audio.play();
                    }}
                  >
                    <PlayIcon className="h-5 w-5 text-zinc-600" />
                  </Button>
                )}

                {account?.voice?.id !== voice.id ? (
                  <Button
                    onClick={() => onSelectVoice(voice)}
                    className="shrink-0"
                    variant="outline"
                  >
                    Use
                  </Button>
                ) : (
                  <div className="p-2 shrink-0 text-indigo-600 text-sm">Selected</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
