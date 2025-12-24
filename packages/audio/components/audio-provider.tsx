'use client';

import React, { ReactNode, createContext, useContext } from 'react';

import {
  useDownloadAudio as useDownloadAudioSupabase,
  useUploadAudio as useUploadAudioSupabase,
} from '@/packages/audio/hooks/use-db-audio-supabase';
import { Alignment } from '@/packages/audio/types';

interface AudioContextType {
  uploadAudio: ({
    path,
    blob,
    alignment,
  }: {
    path: string;
    blob: string;
    alignment?: Alignment;
  }) => Promise<string>;
  downloadAudio: (path: string) => Promise<Blob>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

type AudioProviderProps = {
  provider: 'supabase';
  children: ReactNode;
};

export function AudioProvider(props: AudioProviderProps) {
  // Call all hooks unconditionally to satisfy React Hooks rules
  const supabaseUpload = useUploadAudioSupabase();
  const supabaseDownload = useDownloadAudioSupabase();

  // Use the appropriate hooks based on provider
  const { uploadAudio } = supabaseUpload;
  const { downloadAudio } = supabaseDownload;

  return (
    <AudioContext.Provider value={{ uploadAudio, downloadAudio }}>
      {props.children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
