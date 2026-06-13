'use client';

import { useCallback, useEffect, useState } from 'react';

import { useCurrentUser } from '@/packages/account';

import type { UploadStatus } from '../types';
import { deleteVoiceSample, getVoiceSamples, uploadVoiceSample } from '../voice-samples';

export interface UseUploadReturn {
  status: UploadStatus;
  error: string | null;
  uploadedFiles: string[];
  uploadFile: (file: File) => Promise<string>;
  deleteFile: (id: string) => Promise<void>;
}

export function useUpload(): UseUploadReturn {
  const { user } = useCurrentUser();
  const userId = user.id;

  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  useEffect(() => {
    getVoiceSamples(userId, 'upload')
      .then(samples => setUploadedFiles(samples.map(s => s.id)))
      .catch(err => console.error('Error loading uploaded files:', err));
  }, [userId]);

  const uploadFile = useCallback(
    async (file: File) => {
      setStatus('uploading');
      setError(null);
      try {
        const id = await uploadVoiceSample({ userId, file, type: 'upload' });
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
    [userId]
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
    []
  );

  return { status, error, uploadedFiles, uploadFile, deleteFile };
}
