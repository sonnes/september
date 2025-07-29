import { useState } from 'react';

import { v4 as uuidv4 } from 'uuid';

import { useAccountContext } from '@/components/context/account-provider';
import MessagesService from '@/services/messages';
import supabase from '@/supabase/client';

import { useToast } from './use-toast';

export function useCreateMessage() {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const { account } = useAccountContext();
  const { showError } = useToast();

  const messagesService = new MessagesService(supabase);

  const createSpeech = async ({ text, voice_id }: { text: string; voice_id?: string }) => {
    const response = await fetch('/api/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_id }),
    });

    const { blob, alignment } = await response.json();

    return { blob, alignment };
  };

  const createMessage = async ({ text, voice_id }: { text: string; voice_id?: string }) => {
    setStatus('loading');
    try {
      const { blob, alignment } = await createSpeech({ text, voice_id });

      const id = uuidv4();
      const audioPath = `${id}.mp3`;

      const [_, createResponse] = await Promise.all([
        messagesService.uploadAudio({
          path: audioPath,
          blob,
          alignment,
        }),
        messagesService.createMessage({
          id,
          text,
          type: 'speech',
          user_id: account.id,
          audio_path: audioPath,
        }),
      ]);

      return { message: createResponse, audio: { blob, alignment } };
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
    const { data, error } = await supabase
      .from('messages')
      .upsert({
        id,
        text,
        type: 'transcription',
        user_id: account.id,
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
