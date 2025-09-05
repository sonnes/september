'use client';

import { ReactNode, createContext, useContext } from 'react';

import { Alignment } from '@/types/audio';

import {
  useDownloadAudio as useDownloadAudioSupabase,
  useUploadAudio as useUploadAudioSupabase,
} from './use-supabase';
import {
  useDownloadAudio as useDownloadAudioTriplit,
  useUploadAudio as useUploadAudioTriplit,
} from './use-triplit';

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

type AudioProviderProps =
  | {
      provider: 'supabase';
      children: ReactNode;
    }
  | {
      provider: 'triplit';
      children: ReactNode;
    };

export function AudioProvider(props: AudioProviderProps) {
  const { uploadAudio } =
    props.provider === 'supabase' ? useUploadAudioSupabase() : useUploadAudioTriplit();

  const { downloadAudio } =
    props.provider === 'supabase' ? useDownloadAudioSupabase() : useDownloadAudioTriplit();

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
