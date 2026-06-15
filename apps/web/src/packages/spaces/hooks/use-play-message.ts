'use client';

import { useCallback, useState } from 'react';

import { toast } from 'sonner';

import { downloadAudio, useAudioPlayer } from '@/packages/audio';
import type { Audio } from '@/packages/audio';
import { useSpeech } from '@/packages/speech';

import type { Message } from '../types';

function blobToDataURI(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export interface UsePlayMessageResult {
  /** Play (or pause, if already playing) this message's audio. */
  play: () => void;
  isLoading: boolean;
  isPlaying: boolean;
}

/**
 * Click-to-play for a stored message: replays its saved audio (`audio_path`)
 * when present, otherwise re-synthesizes the text via the speech provider.
 * Clicking the message that's currently playing toggles pause.
 */
export function usePlayMessage(message: Message): UsePlayMessageResult {
  const { enqueue, isPlaying, current, togglePlayPause } = useAudioPlayer();
  const { generateSpeech } = useSpeech();

  const [audio, setAudio] = useState<Audio | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isCurrentlyPlaying = current?.id === message.id && isPlaying;

  const play = useCallback(async () => {
    if (isLoading) return;

    if (isCurrentlyPlaying) {
      togglePlayPause();
      return;
    }

    if (audio) {
      enqueue(audio);
      return;
    }

    try {
      setIsLoading(true);

      if (message.audio_path) {
        const blob = await downloadAudio(message.audio_path);
        if (blob) {
          const track: Audio = { path: message.audio_path, blob: await blobToDataURI(blob) };
          setAudio(track);
          enqueue(track);
        }
      } else {
        const track = (await generateSpeech(message.text)) as Audio;
        track.id = message.id;
        track.text = message.text;
        setAudio(track);
        enqueue(track);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Error playing audio');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isCurrentlyPlaying, audio, message, enqueue, generateSpeech, togglePlayPause]);

  return { play, isLoading, isPlaying: isCurrentlyPlaying };
}
