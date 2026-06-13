'use client';

import { useCallback, useState } from 'react';

import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useAccount } from '@september/account';
import type { Audio } from '@september/audio';
import { uploadAudio } from '@september/audio';
import { useSpeech } from '@september/speech';

import { createMessage } from '../mutations';
import type { CreateMessageData, Message } from '../types';

type CreateAudioStatus = 'idle' | 'generating-speech' | 'uploading-audio' | 'saving-message';

export interface UseCreateAudioMessageReturn {
  createAudioMessage: (message: CreateMessageData) => Promise<{ message: Message; audio: Audio }>;
  status: CreateAudioStatus;
}

export function useCreateAudioMessage(): UseCreateAudioMessageReturn {
  const { user } = useAccount();
  const [status, setStatus] = useState<CreateAudioStatus>('idle');
  const { generateSpeech } = useSpeech();

  const createAudioMessage = useCallback(
    async (message: CreateMessageData) => {
      if (!message.text) {
        throw new Error('Message text is required');
      }

      if (!user?.id && !message.user_id) {
        throw new Error('User ID is required');
      }

      if (!message.id) {
        message.id = uuidv4();
      }

      // Fill user_id from account when missing in the data
      if (!message.user_id && user?.id) {
        message.user_id = user.id;
      }

      try {
        setStatus('generating-speech');
        const speech = await generateSpeech(message.text);

        if (speech?.blob) {
          setStatus('uploading-audio');
          message.audio_path = await uploadAudio({
            path: `${message.id}.mp3`,
            blob: speech.blob,
            alignment: speech.alignment,
          }) ?? undefined;
        }

        setStatus('saving-message');
        const result = await createMessage(message);
        return { message: result, audio: speech as Audio };
      } catch (err) {
        console.error('Failed to create audio message:', err);
        toast.error('Failed to generate or send audio message');
        throw err;
      } finally {
        setStatus('idle');
      }
    },
    [generateSpeech, user]
  );

  return { createAudioMessage, status };
}
