'use client';

import { useState } from 'react';

import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline';

import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useToast } from '@/hooks/use-toast';
import supabase from '@/supabase/client';
import type { Audio } from '@/types/audio';

interface PlayButtonProps {
  audio?: Audio;
  path?: string;
}

export function PlayButton({ path }: PlayButtonProps) {
  const { enqueue, isPlaying, current } = useAudioPlayer();
  const { showError } = useToast();
  const [audio, setAudio] = useState<Audio | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const downloadAudio = async (path: string) => {
    const { data, error } = await supabase.storage.from('audio').download(path);
    if (error || !data) {
      console.error('Error downloading audio:', error);
      showError('Error downloading audio');
      return;
    }
    return data;
  };

  const handlePlay = async () => {
    if (isLoading || !path) return;

    if (audio) {
      enqueue(audio);
      return;
    }

    try {
      setIsLoading(true);

      const blob = await downloadAudio(path);

      if (blob) {
        const audioTrack: Audio = {
          path,
          blob: Buffer.from(await blob.arrayBuffer()).toString('base64'),
        };

        setAudio(audioTrack);
        enqueue(audioTrack);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      showError('Error playing audio');
    } finally {
      setIsLoading(false);
    }
  };

  const isCurrentTrack = current?.path === path;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;

  return (
    <button
      onClick={handlePlay}
      disabled={isLoading}
      className="p-2 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={isCurrentlyPlaying ? 'Pause message' : 'Play message'}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
      ) : isCurrentlyPlaying ? (
        <PauseIcon className="w-4 h-4" />
      ) : (
        <PlayIcon className="w-4 h-4" />
      )}
    </button>
  );
}
