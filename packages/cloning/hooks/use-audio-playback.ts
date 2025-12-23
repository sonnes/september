'use client';

import { useCallback, useRef, useState } from 'react';

import type { RecordingStatus } from '@/packages/cloning/types';

interface UseAudioPlaybackReturn {
  playRecording: (id: string, audioUrl: string) => Promise<void>;
  stopPlaying: (id: string) => void;
  playbackStatus: Record<string, RecordingStatus>;
  playbackError: Record<string, string | null>;
}

export function useAudioPlayback(): UseAudioPlaybackReturn {
  const [playbackStatus, setPlaybackStatus] = useState<Record<string, RecordingStatus>>({});
  const [playbackError, setPlaybackError] = useState<Record<string, string | null>>({});

  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const setStatusFor = useCallback((id: string, status: RecordingStatus) => {
    setPlaybackStatus(prev => ({ ...prev, [id]: status }));
  }, []);

  const setErrorFor = useCallback((id: string, error: string | null) => {
    setPlaybackError(prev => ({ ...prev, [id]: error }));
  }, []);

  const playRecording = useCallback(
    async (id: string, audioUrl: string) => {
      // Stop all other playing audio
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });

      try {
        const audio = new Audio(audioUrl);
        audioRefs.current[id] = audio;

        audio.onended = () => {
          setStatusFor(id, 'idle');
        };

        audio.onerror = () => {
          setStatusFor(id, 'error');
          setErrorFor(id, 'Failed to play recording');
        };

        await audio.play();
        setStatusFor(id, 'playing');
      } catch (err) {
        setStatusFor(id, 'error');
        setErrorFor(id, err instanceof Error ? err.message : 'Failed to play recording');
      }
    },
    [setStatusFor, setErrorFor]
  );

  const stopPlaying = useCallback((id: string) => {
    const audio = audioRefs.current[id];
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setStatusFor(id, 'idle');
  }, [setStatusFor]);

  return {
    playRecording,
    stopPlaying,
    playbackStatus,
    playbackError,
  };
}
