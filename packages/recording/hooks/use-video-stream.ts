'use client';

import { useCallback, useRef, useState } from 'react';
import type { UseVideoStreamReturn } from '../types';

export function useVideoStream(): UseVideoStreamReturn {
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const initializeStream = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user',
        },
        audio: false, // Audio comes from Web Audio API
      });

      streamRef.current = stream;
      setVideoStream(stream);
      setIsLoading(false);
      return stream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access webcam';
      setError(errorMessage);
      setIsLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setVideoStream(null);
    }
  }, []);

  return {
    videoStream,
    error,
    isLoading,
    initializeStream,
    stopStream,
  };
}
