'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAccount } from '@/services/account/context';
import { useSpeechContext } from '@/services/speech/context';

import type { Voice } from '@/types/voice';

import VoicesList from './voices-list';

interface VoicesPageWrapperProps {
  search?: string;
}

export default function VoicesPageWrapper({ search }: VoicesPageWrapperProps) {
  const { account, updateAccount } = useAccount();
  const { listVoices } = useSpeechContext();

  const [voices, setVoices] = useState<Voice[]>([]);

  // Fetch voices using the speech service
  const fetchVoices = useCallback(async () => {
    try {
      const speechVoices = await listVoices({ search });
      setVoices(speechVoices);
    } catch (err) {
      console.error('Error fetching voices:', err);
    }
  }, [listVoices, search]);

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

  // Fetch voices on mount and when search changes
  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

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

  return (
    <VoicesList
      voices={voices}
      selectedVoiceId={account?.voice?.id}
      onSelectVoice={handleSelectVoice}
    />
  );
}
