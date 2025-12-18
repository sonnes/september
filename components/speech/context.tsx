'use client';

import { createContext, useContext } from 'react';

import { useSpeech } from './use-speech';

export const SpeechContext = createContext<ReturnType<typeof useSpeech> | null>(null);

export function SpeechProvider({ children }: { children: React.ReactNode }) {
  const data = useSpeech();

  return <SpeechContext.Provider value={data}>{children}</SpeechContext.Provider>;
}

export function useSpeechContext() {
  const context = useContext(SpeechContext);
  if (!context) {
    throw new Error('useSpeechContext must be used within a SpeechProvider');
  }
  return context;
}
