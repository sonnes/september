import { useCallback } from 'react';

import { useAccountContext } from '@/packages/account';
import { triplit } from '@/triplit/client';

const USER_ID = 'local-user';

export function useVoiceStorage() {
  const { user } = useAccountContext();

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
      // Convert file to base64
      const blob = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(blob)));
      const mimeType = file.type || 'audio/webm';
      const blobString = `data:${mimeType};base64,${base64}`;

      // Generate ID
      const id = type === 'recording' && sampleId 
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

      return id;
    },
    []
  );

  const getVoiceSamples = useCallback(
    async (type?: 'upload' | 'recording') => {
      let query = triplit.query('voice_samples').Where('user_id', '=', USER_ID);
      
      if (type) {
        query = query.Where('type', '=', type);
      }

      const samples = await triplit.fetch(query);
      return samples || [];
    },
    []
  );

  const deleteVoiceSample = useCallback(async (id: string) => {
    await triplit.delete('voice_samples', id);
  }, []);

  const downloadVoiceSample = useCallback(async (id: string): Promise<Blob> => {
    const sample = await triplit.fetchById('voice_samples', id);

    if (!sample) {
      throw new Error('Voice sample not found');
    }

    // Parse the blob string
    const parts = sample.blob.split(',');
    const prefix = parts.length > 1 ? parts[0] : '';
    const base64 = parts.length > 1 ? parts[1] : parts[0];

    const mimeType = prefix
      ? prefix.split(';')[0].replace('data:', '').trim()
      : 'audio/webm';

    // Convert base64 to Blob
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes], { type: mimeType });
  }, []);

  return {
    uploadVoiceSample,
    getVoiceSamples,
    deleteVoiceSample,
    downloadVoiceSample,
  };
}

