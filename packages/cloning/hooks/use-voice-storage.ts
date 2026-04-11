'use client';

import { useCallback, useMemo } from 'react';

import { useAuth } from '@september/account';
import { AudioService } from '@september/audio';
import { VoiceSample } from '../types';

const LOCAL_USER_ID = 'local-user';

export interface UseVoiceStorageReturn {
  uploadVoiceSample: (params: {
    file: File;
    type: 'upload' | 'recording';
    sampleId?: string;
  }) => Promise<string>;
  getVoiceSamples: (type?: 'upload' | 'recording') => Promise<VoiceSample[]>;
  deleteVoiceSample: (id: string) => Promise<void>;
  downloadVoiceSample: (id: string) => Promise<Blob>;
}

export function useVoiceStorage(): UseVoiceStorageReturn {
  const { user } = useAuth();
  const userId = user?.id || LOCAL_USER_ID;
  const audioService = useMemo(() => new AudioService(), []);

  const uploadVoiceSample = useCallback(
    async ({
      file,
      type,
      sampleId,
    }: {
      file: File;
      type: 'upload' | 'recording';
      sampleId?: string;
    }) => {
      const contentType = file.type || 'audio/webm';
      const filename =
        type === 'recording' && sampleId
          ? `${sampleId}.webm`
          : `${Date.now()}-${file.name}`;

      const path = `voice-samples/${userId}/${type}/${filename}`;

      // Binary upload — avoids the base64 call-stack overflow on large files.
      await audioService.uploadAudioBinary({
        path,
        blob: file,
        contentType,
        metadata: {
          user_id: userId,
          type,
          sample_id: sampleId,
          file_name: type === 'upload' ? file.name : undefined,
        },
      });

      return path;
    },
    [userId, audioService]
  );

  const getVoiceSamples = useCallback(
    async (type?: 'upload' | 'recording'): Promise<VoiceSample[]> => {
      if (!type) {
        const [uploads, recordings] = await Promise.all([
          getVoiceSamples('upload'),
          getVoiceSamples('recording'),
        ]);
        return [...uploads, ...recordings];
      }

      const folderPath = `voice-samples/${userId}/${type}`;
      const files = await audioService.listAudio(folderPath);

      return (files || []).map(file => {
        const metadata = file.metadata || {};
        return {
          id: `${folderPath}/${file.name}`,
          user_id: (metadata.user_id as string) || userId,
          type: (metadata.type as 'upload' | 'recording') || type,
          sample_id: metadata.sample_id as string | undefined,
          file_name: metadata.file_name as string | undefined,
          created_at: new Date(file.created_at),
        };
      });
    },
    [userId, audioService]
  );

  const deleteVoiceSample = useCallback(
    async (id: string) => {
      await audioService.deleteAudio(id);
    },
    [audioService]
  );

  const downloadVoiceSample = useCallback(
    async (id: string): Promise<Blob> => {
      return audioService.downloadAudio(id);
    },
    [audioService]
  );

  return {
    uploadVoiceSample,
    getVoiceSamples,
    deleteVoiceSample,
    downloadVoiceSample,
  };
}
