import { useState } from 'react';

import { v4 as uuidv4 } from 'uuid';

import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useAccount } from '@/services/account/context';
import MessagesService from '@/services/messages';
import { useSpeech } from '@/services/speech/use-speech';
import supabase from '@/supabase/client';

import { useToast } from './use-toast';

export function useCreateMessage() {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');

  const { account } = useAccount();
  const { showError } = useToast();
  const { generateSpeech } = useSpeech();
  const { enqueue } = useAudioPlayer();

  const messagesService = new MessagesService(supabase);

  const createMessage = async ({ text }: { text: string }) => {
    setStatus('loading');
    try {
      const audio = await generateSpeech(text);

      enqueue(audio);

      const id = uuidv4();
      const audioPath = `${id}.mp3`;

      const [_, createResponse] = await Promise.all([
        audio.blob
          ? messagesService.uploadAudio({
              path: audioPath,
              blob: audio.blob,
              alignment: audio.alignment,
            })
          : Promise.resolve(null),
        messagesService.createMessage({
          id,
          text,
          type: 'speech',
          user_id: account.id,
          audio_path: audio.blob ? audioPath : undefined,
        }),
      ]);

      return { message: createResponse, audio };
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
    if (!text || text.trim().length === 0 || text.length < 3) {
      return;
    }

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
