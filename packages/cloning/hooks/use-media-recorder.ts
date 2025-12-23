'use client';

import { useCallback, useRef, useState } from 'react';

import type { RecordingStatus } from '@/packages/cloning/types';

interface UseMediaRecorderReturn {
  startRecording: (id: string) => Promise<void>;
  stopRecording: (id: string) => void;
  recordingStatus: Record<string, RecordingStatus>;
  recordingError: Record<string, string | null>;
  onRecordingComplete: (callback: (id: string, blob: Blob) => void) => void;
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [recordingStatus, setRecordingStatus] = useState<Record<string, RecordingStatus>>({});
  const [recordingError, setRecordingError] = useState<Record<string, string | null>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingCompleteCallbackRef = useRef<((id: string, blob: Blob) => void) | null>(null);

  const setStatusFor = useCallback((id: string, status: RecordingStatus) => {
    setRecordingStatus(prev => ({ ...prev, [id]: status }));
  }, []);

  const setErrorFor = useCallback((id: string, error: string | null) => {
    setRecordingError(prev => ({ ...prev, [id]: error }));
  }, []);

  const startRecording = useCallback(
    async (id: string) => {
      setStatusFor(id, 'recording');
      setErrorFor(id, null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = event => {
          chunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          recordingCompleteCallbackRef.current?.(id, blob);

          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
      } catch (err) {
        setStatusFor(id, 'error');
        setErrorFor(id, err instanceof Error ? err.message : 'Failed to start recording');
      }
    },
    [setStatusFor, setErrorFor]
  );

  const stopRecording = useCallback((id: string) => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const onRecordingComplete = useCallback((callback: (id: string, blob: Blob) => void) => {
    recordingCompleteCallbackRef.current = callback;
  }, []);

  return {
    startRecording,
    stopRecording,
    recordingStatus,
    recordingError,
    onRecordingComplete,
  };
}
