'use client';

import { useCallback, useRef, useState } from 'react';

import type { RecordingStatus } from '@september/cloning/types';

interface UseAudioPlaybackReturn {
  playRecording: (id: string, blob: Blob) => Promise<void>;
  stopPlaying: (id: string) => void;
  playbackStatus: Record<string, RecordingStatus>;
  playbackError: Record<string, string | null>;
}

export function useAudioPlayback(): UseAudioPlaybackReturn {
  const [playbackStatus, setPlaybackStatus] = useState<Record<string, RecordingStatus>>({});
  const [playbackError, setPlaybackError] = useState<Record<string, string | null>>({});

  // Track {audio, objectUrl} per sample so we can revoke and clean up properly
  const audioRefs = useRef<Record<string, { audio: HTMLAudioElement; url: string }>>({});

  const setStatusFor = useCallback((id: string, status: RecordingStatus) => {
    setPlaybackStatus(prev => ({ ...prev, [id]: status }));
  }, []);

  const setErrorFor = useCallback((id: string, error: string | null) => {
    setPlaybackError(prev => ({ ...prev, [id]: error }));
  }, []);

  const revokeAndClean = useCallback((id: string) => {
    const entry = audioRefs.current[id];
    if (entry) {
      URL.revokeObjectURL(entry.url);
      delete audioRefs.current[id];
    }
  }, []);

  const playRecording = useCallback(
    async (id: string, blob: Blob) => {
      // Stop all other playing audio first
      for (const [otherId, entry] of Object.entries(audioRefs.current)) {
        entry.audio.pause();
        entry.audio.currentTime = 0;
        if (otherId !== id) {
          URL.revokeObjectURL(entry.url);
          delete audioRefs.current[otherId];
          setStatusFor(otherId, 'idle');
        }
      }

      // Revoke any previous URL for this id
      revokeAndClean(id);

      const url = URL.createObjectURL(blob);

      try {
        const audio = new Audio(url);
        audioRefs.current[id] = { audio, url };

        audio.onended = () => {
          revokeAndClean(id);
          setStatusFor(id, 'idle');
        };

        audio.onerror = () => {
          revokeAndClean(id);
          setStatusFor(id, 'error');
          setErrorFor(id, 'Failed to play recording');
        };

        await audio.play();
        setStatusFor(id, 'playing');
      } catch (err) {
        revokeAndClean(id);
        setStatusFor(id, 'error');
        setErrorFor(id, err instanceof Error ? err.message : 'Failed to play recording');
      }
    },
    [setStatusFor, setErrorFor, revokeAndClean]
  );

  const stopPlaying = useCallback(
    (id: string) => {
      const entry = audioRefs.current[id];
      if (!entry) return;

      entry.audio.pause();
      entry.audio.currentTime = 0;
      revokeAndClean(id);
      setStatusFor(id, 'idle');
    },
    [setStatusFor, revokeAndClean]
  );

  return {
    playRecording,
    stopPlaying,
    playbackStatus,
    playbackError,
  };
}
