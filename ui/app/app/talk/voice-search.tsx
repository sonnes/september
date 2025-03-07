'use client';

import { useCallback, useEffect, useState } from 'react';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  PlayCircleIcon,
  PlayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { DialogBody, DialogTitle } from '@/components/catalyst/dialog';
import { useDebounce } from '@/hooks/useDebounce';
import type { Voice } from '@/types/speech';

import { addVoice, getVoices } from './actions';

interface VoiceSearchProps {
  onClose: () => void;
  onSelectVoice: (voice: Voice) => void;
  onCloseDialog: () => void;
}

export default function VoiceSearch({ onClose, onSelectVoice, onCloseDialog }: VoiceSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const searchVoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getVoices({
        search: debouncedQuery.length > 0 ? debouncedQuery : undefined,
      });
      setVoices(response.voices || []);
    } catch (error) {
      console.error('Error fetching voices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) return;
    searchVoices();
  }, [debouncedQuery]);

  // Initial fetch when component mounts
  useEffect(() => {
    searchVoices();
  }, []);

  // Helper function to combine class names
  const classNames = (...classes: string[]) => {
    return classes.filter(Boolean).join(' ');
  };

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
    <>
      <div className="absolute top-4 left-4">
        <button
          onClick={onClose}
          className="rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Back"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
      </div>
      <div className="absolute top-4 right-4">
        <button
          onClick={onCloseDialog}
          className="rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Close"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <DialogTitle className="text-xl font-semibold px-8">Select a voice</DialogTitle>

      <DialogBody className="space-y-4 py-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Search voices..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {voices.map(voice => (
              <li
                key={voice.voice_id}
                className="flex items-center justify-between gap-x-6 py-5 px-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                onClick={() => onSelectVoice(voice)}
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-x-3">
                    <p className="text-sm/6 font-semibold text-gray-900">{voice.name}</p>
                    {voice.labels?.['gender'] && (
                      <p
                        className={classNames(
                          getGenderStyle(voice.labels['gender']),
                          'mt-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset'
                        )}
                      >
                        {voice.labels['gender']}
                      </p>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-x-2 text-xs/5 text-gray-500">
                    {voice.labels?.['accent'] && (
                      <p className="truncate capitalize">{voice.labels['accent'].toLowerCase()}</p>
                    )}
                    {voice.labels?.['age'] && (
                      <p className="truncate capitalize">{voice.labels['age'].toLowerCase()}</p>
                    )}
                    {voice.labels?.['use_case'] && (
                      <p className="truncate capitalize">
                        {voice.labels['use_case'].toLowerCase()}
                      </p>
                    )}
                  </div>
                  {voice.description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{voice.description}</p>
                  )}
                </div>
                <div className="flex flex-none items-center gap-x-4">
                  {voice.preview_url && (
                    <button
                      className="cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        const audio = new Audio(voice.preview_url);
                        audio.play();
                      }}
                    >
                      <PlayIcon className="h-5 w-5" />
                      <span className="sr-only">, {voice.name}</span>
                    </button>
                  )}
                </div>
              </li>
            ))}

            {voices.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                No voices found matching your search criteria
              </div>
            )}
          </ul>
        )}
      </DialogBody>
    </>
  );
}
