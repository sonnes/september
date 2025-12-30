'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useRecording } from '../hooks/use-recording';
import { useAudioDestination } from '../hooks/use-audio-destination';
import type { UseRecordingReturn, UseAudioDestinationReturn } from '../types';

interface RecordingContextValue {
  recording: UseRecordingReturn;
  audioDestination: UseAudioDestinationReturn;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const audioDestination = useAudioDestination();
  const recording = useRecording(audioDestination);

  return (
    <RecordingContext.Provider value={{ recording, audioDestination }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecordingContext() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecordingContext must be used within RecordingProvider');
  }
  return context;
}
