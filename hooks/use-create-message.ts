import { useState } from 'react';

import { useAccountContext } from '@/components/context/account-provider';
import supabase from '@/supabase/client';

import { useToast } from './use-toast';

export function useCreateMessage() {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const { user } = useAccountContext();
  const { showError } = useToast();

  const createMessage = async ({ text, voice_id }: { text: string; voice_id?: string }) => {
    setStatus('loading');
    try {
      const response = await fetch('/api/messages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.error || 'Failed to create message');
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      // Handle network errors or other exceptions
      if (error instanceof Error) {
        showError(error.message || 'An unexpected error occurred');
      } else {
        showError('An unexpected error occurred');
      }
      throw error;
    } finally {
      setStatus('idle');
    }
  };

  const createTranscription = async ({ id, text }: { id: string; text: string }) => {
    if (!user) {
      showError('User not found');
      throw new Error('User not found');
    }

    const { data, error } = await supabase
      .from('messages')
      .upsert({
        id,
        text,
        type: 'transcription',
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      showError(error.message || 'Failed to create transcription');
      throw new Error(error.message);
    }

    return data;
  };

  return { createMessage, createTranscription, status };
}
