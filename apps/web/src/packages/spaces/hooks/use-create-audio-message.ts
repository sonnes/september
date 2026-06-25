'use client';

import { useCallback, useState } from 'react';

import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useAccount } from '@/packages/account';
import type { Audio } from '@/packages/audio';
import { uploadAudio } from '@/packages/audio';
import { useSpeech } from '@/packages/speech';

import { synthesizeWithFallback } from '../lib/synthesize-with-fallback';
import { createMessage } from '../mutations';
import type { CreateMessageData, Message } from '../types';

type CreateAudioStatus = 'idle' | 'generating-speech' | 'uploading-audio' | 'saving-message';

export interface UseCreateAudioMessageReturn {
  createAudioMessage: (
    message: CreateMessageData,
    opts?: { previousText?: string; playLive?: boolean }
  ) => Promise<{ message: Message; audio: Audio; playedLive: boolean }>;
  status: CreateAudioStatus;
}

export function useCreateAudioMessage(): UseCreateAudioMessageReturn {
  const { user } = useAccount();
  const [status, setStatus] = useState<CreateAudioStatus>('idle');
  const { generateSpeech, generateSpeechStream } = useSpeech();

  const createAudioMessage = useCallback(
    async (
      message: CreateMessageData,
      opts?: { previousText?: string; playLive?: boolean }
    ) => {
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

      const context = { previous_text: opts?.previousText };

      try {
        setStatus('generating-speech');

        // Low-latency path: stream over WebSocket and play chunks live. The
        // resolved blob still flows to upload/save/broadcast. Any WS failure
        // (or non-streaming provider) falls back to the buffered REST call.
        const { speech, playedLive } = await synthesizeWithFallback(
          opts?.playLive ? generateSpeechStream(message.text, undefined, context) : undefined,
          () => generateSpeech(message.text, undefined, context)
        );

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
        return { message: result, audio: speech as Audio, playedLive };
      } catch (err) {
        console.error('Failed to create audio message:', err);
        toast.error('Failed to generate or send audio message');
        throw err;
      } finally {
        setStatus('idle');
      }
    },
    [generateSpeech, generateSpeechStream, user]
  );

  return { createAudioMessage, status };
}
