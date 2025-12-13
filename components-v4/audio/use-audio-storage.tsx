import { useCallback } from 'react';

import { useToast } from '@/hooks/use-toast';

import { triplit } from '@/triplit/client';
import { Alignment } from '@/types/audio';

export function useAudioStorage() {
  const uploadAudio = async ({
    path,
    blob,
    alignment,
  }: {
    path: string;
    blob: string;
    alignment?: Alignment;
  }) => {
    // Store audio data in Triplit database
    await triplit.insert('audio_files', {
      id: path,
      blob,
      alignment,
      created_at: new Date(),
    });

    return path;
  };

  const downloadAudio = async (path: string) => {
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
  };

  return { uploadAudio, downloadAudio };
}
