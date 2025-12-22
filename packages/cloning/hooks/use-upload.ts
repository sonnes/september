'use client';

import { useCallback, useEffect, useState } from 'react';

import { useVoiceStorage } from '@/packages/cloning/hooks/use-voice-storage';
import { UploadStatus } from '@/packages/cloning/types';

export function useUploadLogic(initialUploadedFiles: string[] = []) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(initialUploadedFiles);
  const { uploadVoiceSample, deleteVoiceSample, getVoiceSamples } = useVoiceStorage();

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const samples = await getVoiceSamples('upload');
        setUploadedFiles(samples.map(s => s.id));
      } catch (err) {
        console.error('Error loading uploaded files:', err);
      }
    };
    loadFiles();
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
