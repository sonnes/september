'use client';

import { useCallback, useEffect, useState } from 'react';

import { useVoiceStorage, UseVoiceStorageReturn } from '@september/cloning/hooks/use-voice-storage';
import { UploadStatus } from '@september/cloning/types';

/**
 * When called from CloningProvider, receives the shared voiceStorage so there
 * is one AudioService instance and one IndexedDB mount-scan across the tree.
 * When called standalone, creates its own storage instance.
 */
export function useUploadLogic(sharedStorage?: UseVoiceStorageReturn) {
  const ownStorage = useVoiceStorage();
  const { uploadVoiceSample, deleteVoiceSample, getVoiceSamples } =
    sharedStorage ?? ownStorage;

  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  useEffect(() => {
    getVoiceSamples('upload')
      .then(samples => setUploadedFiles(samples.map(s => s.id)))
      .catch(err => console.error('Error loading uploaded files:', err));
  }, [getVoiceSamples]);

  const uploadFile = useCallback(
    async (file: File) => {
      setStatus('uploading');
      setError(null);

      try {
        const id = await uploadVoiceSample({ file, type: 'upload' });
        setStatus('idle');
        setUploadedFiles(prev => [...prev, id]);
        return id;
      } catch (err) {
        setStatus('error');
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
        setError(errorMessage);
        throw err;
      }
    },
    [uploadVoiceSample]
  );

  const deleteFile = useCallback(
    async (id: string) => {
      setStatus('uploading');
      setError(null);

      try {
        await deleteVoiceSample(id);
        setStatus('idle');
        setUploadedFiles(prev => prev.filter(fileId => fileId !== id));
      } catch (err) {
        setStatus('error');
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
        setError(errorMessage);
        throw err;
      }
    },
    [deleteVoiceSample]
  );

  return {
    status,
    error,
    uploadedFiles,
    uploadFile,
    deleteFile,
  };
}
