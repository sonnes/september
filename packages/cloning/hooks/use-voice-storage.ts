'use client';

import { useCallback, useMemo } from 'react';

import { toast } from 'sonner';

import supabase from '@/supabase/client';
import { useAuth } from '@/packages/account';
import { AudioService } from '@/packages/audio';

const LOCAL_USER_ID = 'local-user';

export interface VoiceSample {
  id: string;
  user_id: string;
  type: 'upload' | 'recording';
  sample_id?: string;
  blob?: string;
  file_name?: string;
  created_at: Date;
}

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
  const audioService = useMemo(() => new AudioService(supabase), []);

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
      try {
        // Convert file to base64 for AudioService
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const mimeType = file.type || 'audio/webm';

        // Generate path
        const filename =
          type === 'recording' && sampleId
            ? `${sampleId}.webm`
            : `${Date.now()}-${file.name}`;
        
        const path = `voice-samples/${userId}/${type}/${filename}`;

        // Store in Supabase Storage via AudioService
        await audioService.uploadAudio({
          path,
          blob: base64,
          contentType: mimeType,
          metadata: {
            user_id: userId,
            type,
            sample_id: sampleId,
            file_name: type === 'upload' ? file.name : undefined,
          },
        });

        toast.success('Voice sample uploaded');
        return path;
      } catch (err) {
        console.error('Failed to upload voice sample:', err);
        toast.error('Failed to upload voice sample');
        throw err;
      }
    },
    [userId, audioService]
  );

  const getVoiceSamples = useCallback(
    async (type?: 'upload' | 'recording'): Promise<VoiceSample[]> => {
      try {
        if (!type) {
          // If no type, we'd need to list both folders.
          // For now, let's assume type is always provided as per current usage.
          const uploads = await getVoiceSamples('upload');
          const recordings = await getVoiceSamples('recording');
          return [...uploads, ...recordings];
        }

        const folderPath = `voice-samples/${userId}/${type}`;
        const files = await audioService.listAudio(folderPath);

        return (files || []).map(file => {
          const metadata = file.metadata || {};
          return {
            id: `${folderPath}/${file.name}`,
            user_id: metadata.user_id || userId,
            type: (metadata.type as 'upload' | 'recording') || type,
            sample_id: metadata.sample_id,
            file_name: metadata.file_name,
            created_at: new Date(file.created_at),
          };
        });
      } catch (err) {
        console.error('Failed to fetch voice samples:', err);
        throw err;
      }
    },
    [userId, audioService]
  );

  const deleteVoiceSample = useCallback(async (id: string) => {
    try {
      await audioService.deleteAudio(id);
      toast.success('Voice sample deleted');
    } catch (err) {
      console.error('Failed to delete voice sample:', err);
      toast.error('Failed to delete voice sample');
      throw err;
    }
  }, [audioService]);

  const downloadVoiceSample = useCallback(async (id: string): Promise<Blob> => {
    try {
      return await audioService.downloadAudio(id);
    } catch (err) {
      console.error('Failed to download voice sample:', err);
      throw err;
    }
  }, [audioService]);

  return {
    uploadVoiceSample,
    getVoiceSamples,
    deleteVoiceSample,
    downloadVoiceSample,
  };
}
