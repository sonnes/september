'use client';

import { createContext, useContext, useMemo } from 'react';

import { useRecording } from '@september/cloning/hooks/use-recording';
import { useUploadLogic } from '@september/cloning/hooks/use-upload';
import { useVoiceStorage, UseVoiceStorageReturn } from '@september/cloning/hooks/use-voice-storage';
import { RecordingContextType, UploadContextType } from '@september/cloning/types';

// ─── VoiceStorage context (single instance for the whole cloning tree) ───────
// Hoisted here so useUploadLogic, useRecordingState, and form.tsx all share one
// AudioService instance and one set of IndexedDB mount-effects.

export const VoiceStorageContext = createContext<UseVoiceStorageReturn | null>(null);

export function useVoiceStorageContext(): UseVoiceStorageReturn {
  const context = useContext(VoiceStorageContext);
  if (!context) throw new Error('useVoiceStorageContext must be used within a CloningProvider');
  return context;
}

// ─── Upload context ───────────────────────────────────────────────

export const UploadContext = createContext<UploadContextType | null>(null);

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) throw new Error('useUpload must be used within a CloningProvider');
  return context;
}

// ─── Recording context ────────────────────────────────────────────

export const RecordingContext = createContext<RecordingContextType | null>(null);

export function useRecordingContext() {
  const context = useContext(RecordingContext);
  if (!context) throw new Error('useRecordingContext must be used within a CloningProvider');
  return context;
}

// ─── Composite provider ───────────────────────────────────────────

export function CloningProvider({ children }: { children: React.ReactNode }) {
  // Single shared useVoiceStorage instance — avoids 4 separate AudioService
  // allocations and 4 IndexedDB mount-scans across the cloning subtree.
  const voiceStorage = useVoiceStorage();
  const uploadLogic = useUploadLogic(voiceStorage);
  const recordingLogic = useRecording({}, voiceStorage);

  return (
    <VoiceStorageContext.Provider value={voiceStorage}>
      <UploadContext.Provider value={uploadLogic}>
        <RecordingContext.Provider value={recordingLogic}>
          {children}
        </RecordingContext.Provider>
      </UploadContext.Provider>
    </VoiceStorageContext.Provider>
  );
}
