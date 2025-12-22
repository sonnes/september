'use client';

import { useCallback, useState } from 'react';

import { v4 as uuidv4 } from 'uuid';

import { useAccountContext } from '@/packages/account';
import { useAudioStorage } from '@/packages/audio';
import { useSpeech } from '@/packages/speech';

import { triplit } from '@/triplit/client';
import { Audio } from '@/packages/audio';

import { CreateMessageData } from '@/packages/chats/types/message';

export function useCreateMessage() {
  const { user } = useAccountContext();

  const createMessage = useCallback(
    async (message: CreateMessageData) => {
      const result = await Promise.all([
        triplit.insert('messages', message),
        triplit.update('chats', message.chat_id || '', {
          updated_at: new Date(),
        }),
      ]);
      return result;
    },
    [user]
  );

  return { createMessage };
}

type CreateAudioStatus = 'idle' | 'generating-speech' | 'uploading-audio' | 'saving-message';

export function useCreateAudioMessage() {
  const { user } = useAccountContext();
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
        message.id = uuidv4();
      }

      setStatus('generating-speech');
      const speech = await generateSpeech(message.text);

      console.log('speech', speech);
      if (speech?.blob) {
        message.audio_path = `${message.id}.mp3`;
        setStatus('uploading-audio');
        await uploadAudio({
          path: message.audio_path,
          blob: speech.blob,
          alignment: speech.alignment,
        });
      }

      setStatus('saving-message');

      const result = await createMessage(message);
      setStatus('idle');

      return { message: result, audio: speech as Audio };
    },
    [createMessage, generateSpeech, uploadAudio]
  );

  return { createAudioMessage, status };
}
