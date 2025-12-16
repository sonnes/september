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

    // parse the prefix from the blob
    const parts = audioFile.blob.split(',');

    const prefix = (parts.length > 1 ? parts[0] : '') as string;
    const base64 = (parts.length > 1 ? parts[1] : parts[0]) as string;

    const type = (
      prefix !== '' ? prefix.split(';')[0].replace('data:', '').trim() : 'audio/mp3'
    ) as string;

    // Convert base64 string back to Blob
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes], { type });
  };

  return { uploadAudio, downloadAudio };
}
