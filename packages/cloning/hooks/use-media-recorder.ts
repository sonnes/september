'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { MediaRecorderManager } from '@september/cloning/lib/media-recorder-manager';
import type { RecordingStatus } from '@september/cloning/types';

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

  const managerRef = useRef<MediaRecorderManager | null>(null);
  const completeCallbackRef = useRef<((id: string, blob: Blob) => void) | null>(null);

  if (!managerRef.current) {
    managerRef.current = new MediaRecorderManager();
  }

  managerRef.current.setCallbacks({
    onComplete: (id, blob) => completeCallbackRef.current?.(id, blob),
    onStatusChange: (id, status) =>
      setRecordingStatus(prev => ({ ...prev, [id]: status as RecordingStatus })),
    onError: (id, error) =>
      setRecordingError(prev => ({ ...prev, [id]: error })),
  });

  // Release the microphone when the component unmounts
  useEffect(() => {
    return () => {
      managerRef.current?.stopAll();
    };
  }, []);

  const startRecording = useCallback(async (id: string) => {
    await managerRef.current?.startRecording(id);
  }, []);

  const stopRecording = useCallback((id: string) => {
    managerRef.current?.stopRecording(id);
  }, []);

  const onRecordingComplete = useCallback((callback: (id: string, blob: Blob) => void) => {
    completeCallbackRef.current = callback;
  }, []);

  return {
    startRecording,
    stopRecording,
    recordingStatus,
    recordingError,
    onRecordingComplete,
  };
}
