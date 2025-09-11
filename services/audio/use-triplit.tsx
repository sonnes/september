import { useCallback } from 'react';

import { useToast } from '@/hooks/use-toast';
import { triplit } from '@/triplit/client';
import { Alignment } from '@/types/audio';

export function useUploadAudio() {
  const { showError } = useToast();

  const uploadAudio = useCallback(
    async ({ path, blob, alignment }: { path: string; blob: string; alignment?: Alignment }) => {
      try {
        // Store audio data in Triplit database
        await triplit.insert('audio_files', {
          id: path,
          blob,
          alignment,
          created_at: new Date(),
        });

        return path;
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to upload audio');
        console.error(error);
        throw error;
      }
    },
    [showError]
  );

  return { uploadAudio };
}

export function useDownloadAudio() {
  const { showError } = useToast();

  const downloadAudio = useCallback(
    async (path: string) => {
      try {
        // Fetch audio data from Triplit database
        const audioFile = await triplit.fetchById('audio_files', path);

        if (!audioFile) {
          throw new Error('Audio file not found');
        }

        // Convert base64 string back to Blob
        const binaryString = atob(audioFile.blob);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        return new Blob([bytes], { type: 'audio/mp3' });
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to download audio');
        console.error(error);
        throw error;
      }
    },
    [showError]
  );

  return { downloadAudio };
}
