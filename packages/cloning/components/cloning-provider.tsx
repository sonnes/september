'use client';

import { createContext, useContext } from 'react';

import { useRecording } from '@/packages/cloning/hooks/use-recording';
import { useUploadLogic } from '@/packages/cloning/hooks/use-upload';
import { RecordingContextType, UploadContextType } from '@/packages/cloning/types';

export const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProvider({
  children,
  initialUploadedFiles = [],
}: {
  children: React.ReactNode;
  initialUploadedFiles?: string[];
}) {
  const uploadLogic = useUploadLogic(initialUploadedFiles);

  return <UploadContext.Provider value={uploadLogic}>{children}</UploadContext.Provider>;
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) throw new Error('useUpload must be used within a UploadProvider');
  return context;
}

export const RecordingContext = createContext<RecordingContextType | null>(null);

export function RecordingProvider({
  children,
  initialRecordings = {},
}: {
  children: React.ReactNode;
  initialRecordings?: Record<string, string>;
}) {
  const recordingLogic = useRecording(initialRecordings);

  return <RecordingContext.Provider value={recordingLogic}>{children}</RecordingContext.Provider>;
}

export function useRecordingContext() {
  const context = useContext(RecordingContext);
  if (!context) throw new Error('useRecordingContext must be used within a RecordingProvider');
  return context;
}
