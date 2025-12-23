import { useCallback, useState } from 'react';

import { v4 as uuidv4 } from 'uuid';

import { useAccountContext } from '@/packages/account';
import { Audio, useAudio } from '@/packages/audio';
import { useSpeech } from '@/packages/speech';

import { chatCollection, messageCollection } from '../db';
import { CreateMessageData, Message } from '../types';

export function useCreateMessage() {
  const { user } = useAccountContext();

  const createMessage = useCallback(
    async (message: CreateMessageData) => {
      const messageId = message.id || uuidv4();
      const now = new Date();

      const newMessage: Message = {
        ...message,
        id: messageId,
        user_id: message.user_id || user?.id || '',
        created_at: message.created_at || now,
      };

      // Insert message
      await messageCollection.insert(newMessage);

      // Update chat's updated_at
      if (message.chat_id) {
        await chatCollection.update(message.chat_id, draft => {
          draft.updated_at = now;
        });
      }

      return newMessage;
    },
    [user]
  );

  return { createMessage };
}

type CreateAudioStatus = 'idle' | 'generating-speech' | 'uploading-audio' | 'saving-message';

export function useCreateAudioMessage() {
  const { user } = useAccountContext();
  const { uploadAudio } = useAudio();
  const { createMessage } = useCreateMessage();
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

      setStatus('generating-speech');
      const speech = await generateSpeech(message.text);

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
    [createMessage, generateSpeech, uploadAudio, user?.id]
  );

  return { createAudioMessage, status };
}
