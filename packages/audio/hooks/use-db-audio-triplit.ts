'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { triplit } from '@/triplit/client';
import { Alignment } from '@/packages/audio/types';
import { formatBase64Audio, parseBase64Audio, base64ToBlob } from '@/packages/audio/lib/audio-utils';

export function useUploadAudio() {
  const uploadAudio = useCallback(
    async ({ path, blob, alignment }: { path: string; blob: string; alignment?: Alignment }) => {
      try {
        // Ensure the blob is properly formatted with data URI prefix
        const formattedBlob = formatBase64Audio(blob, 'audio/mp3');

        // Store audio data in Triplit database
        await triplit.insert('audio_files', {
          id: path,
          blob: formattedBlob,
          alignment,
          created_at: new Date(),
        });

        return path;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to upload audio');
        console.error(error);
        throw error;
      }
    },
    []
  );

  return { uploadAudio };
}

export function useDownloadAudio() {
  const downloadAudio = useCallback(async (path: string) => {
    try {
      // Fetch audio data from Triplit database
      const audioFile = await triplit.fetchById('audio_files', path);

      if (!audioFile) {
        throw new Error('Audio file not found');
      }

      // Parse the base64 data and extract type
      const { type, base64 } = parseBase64Audio(audioFile.blob);

      // Convert base64 string back to Blob
      return base64ToBlob(base64, type);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download audio');
      console.error(error);
      throw error;
    }
  }, []);

  return { downloadAudio };
}

