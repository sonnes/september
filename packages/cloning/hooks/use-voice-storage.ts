'use client';

import { useCallback } from 'react';

import { toast } from 'sonner';

import { triplit } from '@/triplit/client';

const USER_ID = 'local-user';

export interface VoiceSample {
  id: string;
  user_id: string;
  type: 'upload' | 'recording';
  sample_id?: string;
  blob: string;
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
        // Convert file to base64
        const blob = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(blob)));
        const mimeType = file.type || 'audio/webm';
        const blobString = `data:${mimeType};base64,${base64}`;

        // Generate ID
        const id =
          type === 'recording' && sampleId
            ? `${USER_ID}/${type}/${sampleId}`
            : `${USER_ID}/${type}/${Date.now()}-${file.name}`;

        // Store in Triplit
        await triplit.insert('voice_samples', {
          id,
          user_id: USER_ID,
          type,
          sample_id: sampleId,
          blob: blobString,
          file_name: type === 'upload' ? file.name : undefined,
          created_at: new Date(),
        });

        toast.success('Voice sample uploaded');
        return id;
      } catch (err) {
        console.error('Failed to upload voice sample:', err);
        toast.error('Failed to upload voice sample');
        throw err;
      }
    },
    []
  );

  const getVoiceSamples = useCallback(async (type?: 'upload' | 'recording') => {
    try {
      let query = triplit.query('voice_samples').Where('user_id', '=', USER_ID);

      if (type) {
        query = query.Where('type', '=', type);
      }

      const samples = await triplit.fetch(query);
      return (samples || []) as unknown as VoiceSample[];
    } catch (err) {
      console.error('Failed to fetch voice samples:', err);
      throw err;
    }
  }, []);

  const deleteVoiceSample = useCallback(async (id: string) => {
    try {
      await triplit.delete('voice_samples', id);
      toast.success('Voice sample deleted');
    } catch (err) {
      console.error('Failed to delete voice sample:', err);
      toast.error('Failed to delete voice sample');
      throw err;
    }
  }, []);

  const downloadVoiceSample = useCallback(async (id: string): Promise<Blob> => {
    try {
      const sample = (await triplit.fetchById('voice_samples', id)) as unknown as VoiceSample;

      if (!sample) {
        throw new Error('Voice sample not found');
      }

      // Parse the blob string
      const parts = sample.blob.split(',');
      const prefix = parts.length > 1 ? parts[0] : '';
      const base64 = parts.length > 1 ? parts[1] : parts[0];

      const mimeType = prefix ? prefix.split(';')[0].replace('data:', '').trim() : 'audio/webm';

      // Convert base64 to Blob
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Blob([bytes], { type: mimeType });
    } catch (err) {
      console.error('Failed to download voice sample:', err);
      throw err;
    }
  }, []);

  return {
    uploadVoiceSample,
    getVoiceSamples,
    deleteVoiceSample,
    downloadVoiceSample,
  };
}
