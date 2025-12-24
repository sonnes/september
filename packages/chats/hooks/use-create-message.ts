import { useCallback, useState } from 'react';

import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useAccountContext } from '@/packages/account';
import { Audio, useAudio } from '@/packages/audio';
import { useSpeech } from '@/packages/speech';

import { chatCollection, messageCollection } from '../db';
import { CreateMessageData, Message } from '../types';

export interface UseCreateMessageReturn {
  createMessage: (message: CreateMessageData) => Promise<Message>;
  isCreating: boolean;
}

export function useCreateMessage(): UseCreateMessageReturn {
  const { user } = useAccountContext();
  const [isCreating, setIsCreating] = useState(false);

  const createMessage = useCallback(
    async (message: CreateMessageData) => {
      setIsCreating(true);
      try {
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
      } catch (err) {
        console.error('Failed to create message:', err);
        toast.error('Failed to send message');
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [user]
  );

  return { createMessage, isCreating };
}

type CreateAudioStatus = 'idle' | 'generating-speech' | 'uploading-audio' | 'saving-message';

export interface UseCreateAudioMessageReturn {
  createAudioMessage: (message: CreateMessageData) => Promise<{ message: Message; audio: Audio }>;
  status: CreateAudioStatus;
}

export function useCreateAudioMessage(): UseCreateAudioMessageReturn {
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

      try {
        setStatus('generating-speech');
        const speech = await generateSpeech(message.text);

        if (speech?.blob) {
          setStatus('uploading-audio');
          message.audio_path = await uploadAudio({
            path: `${message.id}.mp3`,
            blob: speech.blob,
            alignment: speech.alignment,
          });
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
    [createMessage, generateSpeech, uploadAudio, user?.id]
  );

  return { createAudioMessage, status };
}
