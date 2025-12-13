import { useCallback, useState } from 'react';

import { uuidv4 } from 'zod';

import { useAccount } from '@/components-v4/account/context';
import { useAudioStorage } from '@/components-v4/audio/use-audio-storage';
import { useSpeech } from '@/components-v4/speech/use-speech';
import { triplit } from '@/triplit/client';
import { CreateMessageData } from '@/types/message';

export function useCreateMessage() {
  const { user } = useAccount();

  const createMessage = useCallback(
    async (message: CreateMessageData) => {
      const result = await triplit.insert('messages', message);
      return result;
    },
    [user]
  );

  return { createMessage };
}

type CreateAudioStatus = 'idle' | 'generating-speech' | 'uploading-audio' | 'saving-message';

export function useCreateAudioMessage() {
  const { user } = useAccount();
  const { uploadAudio } = useAudioStorage();
  const { createMessage } = useCreateMessage();

  const [status, setStatus] = useState<CreateAudioStatus>('idle');
  const { generateSpeech } = useSpeech();

  const createAudioMessage = useCallback(
    async (message: CreateMessageData) => {
      if (!message.text) {
        throw new Error('Message text is required');
      }

      if (!user?.id) {
        throw new Error('User ID is required');
      }

      if (!message.id) {
        message.id = uuidv4().toString();
      }

      try {
        setStatus('generating-speech');
        const speech = await generateSpeech(message.text);

        message.audio_path = message.audio_path || `${message.id}.mp3`;

        if (speech?.blob) {
          setStatus('uploading-audio');
          await uploadAudio({
            path: message.audio_path,
            blob: speech.blob,
            alignment: speech.alignment,
          });
        }

        setStatus('saving-message');

        await createMessage(message);
        setStatus('idle');
      } catch (error) {
        console.error(error);
        throw error;
      } finally {
        setStatus('idle');
      }
    },
    [generateSpeech, user, uploadAudio]
  );

  return { createAudioMessage, status };
}
