'use client';

import { useState } from 'react';

import { PauseIcon, PlayIcon } from '@heroicons/react/24/outline';

import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useToast } from '@/hooks/use-toast';
import { useAudio } from '@/services/audio';
import type { Audio } from '@/types/audio';

interface PlayButtonProps {
  audio?: Audio;
  path?: string;
}

export function PlayButton({ path }: PlayButtonProps) {
  const { enqueue, isPlaying, current, togglePlayPause } = useAudioPlayer();
  const { showError } = useToast();
  const { downloadAudio } = useAudio();

  const [audio, setAudio] = useState<Audio | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isCurrentTrack = current?.path === path;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;

  const handlePlayPause = async () => {
    if (isLoading || !path) return;

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

  return (
    <button
      onClick={handlePlayPause}
      disabled={isLoading}
      className="p-2 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={isCurrentlyPlaying ? 'Pause message' : 'Play message'}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
      ) : isCurrentlyPlaying ? (
        <PauseIcon className="w-5 h-5" />
      ) : (
        <PlayIcon className="w-5 h-5" />
      )}
    </button>
  );
}
