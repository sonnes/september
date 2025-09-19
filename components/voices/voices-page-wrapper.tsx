'use client';

import { useCallback, useEffect, useState } from 'react';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { TextInput } from '@/components/ui/text-input';

import { useDebounce } from '@/hooks/use-debounce';

import { useAccount } from '@/services/account/context';
import { useSpeechContext } from '@/services/speech/context';

import type { Voice } from '@/types/voice';

import VoicesList from './voices-list';

interface VoicesPageWrapperProps {
  search?: string;
}

export default function VoicesPageWrapper({ search: initialSearch }: VoicesPageWrapperProps) {
  const { account, updateAccount } = useAccount();
  const { listVoices } = useSpeechContext();

  const [isLoading, setIsLoading] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const debouncedSearchTerm = useDebounce(searchTerm, 1000);

  // Fetch voices using the speech service
  const fetchVoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const speechVoices = await listVoices({ search: debouncedSearchTerm });
      setVoices(speechVoices);
    } catch (err) {
      console.error('Error fetching voices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [listVoices, debouncedSearchTerm]);

  // Handle voice selection
  const handleSelectVoice = useCallback(
    async (voice: Voice) => {
      try {
        await updateAccount({
          voice: { id: voice.id, name: voice.name, language: voice.language },
        });
      } catch (err) {
        console.error('Error selecting voice:', err);
      }
    },
    [updateAccount]
  );

  // Handle search input changes with debouncing
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Fetch voices on mount
  useEffect(() => {
    fetchVoices();
  }, [debouncedSearchTerm]);

  return (
    <div className="w-full space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" />
        </div>
        <TextInput
          type="text"
          placeholder="Search voices by name, gender, accent, or description..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10"
        />
      </div>

      {/* Voices List */}

      {(!account || isLoading) && (
        <div className="w-full">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-zinc-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-zinc-600">Loading voices...</p>
          </div>
        </div>
      )}
      {!isLoading && (
        <VoicesList
          voices={voices}
          selectedVoiceId={account?.voice?.id}
          onSelectVoice={handleSelectVoice}
        />
      )}
    </div>
  );
}
