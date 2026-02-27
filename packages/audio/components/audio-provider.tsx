'use client';

import React, { ReactNode, createContext, useContext } from 'react';

import {
  useDownloadAudio,
  useUploadAudio,
} from '@september/audio/hooks/use-db-audio';
import { Alignment } from '@september/audio/types';

interface AudioContextType {
  uploadAudio: ({
    path,
    blob,
    alignment,
  }: {
    path: string;
    blob: string;
    alignment?: Alignment;
  }) => Promise<string | undefined>;
  downloadAudio: (path: string) => Promise<Blob>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

type AudioProviderProps = {
  children: ReactNode;
};

export function AudioProvider(props: AudioProviderProps) {
  const { uploadAudio } = useUploadAudio();
  const { downloadAudio } = useDownloadAudio();

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
