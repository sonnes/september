import { useCallback } from 'react';

import { useToast } from '@/hooks/use-toast';
import supabase from '@/supabase/client';
import { Alignment } from '@/types/audio';

import { AudioService } from './supabase';

const audioService = new AudioService(supabase);

export function useUploadAudio() {
  const { showError } = useToast();

  const uploadAudio = useCallback(
    async ({ path, blob, alignment }: { path: string; blob: string; alignment?: Alignment }) => {
      try {
        const uploadedPath = await audioService.uploadAudio({
          path,
          blob,
          alignment,
        });
        return uploadedPath;
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
        const blob = await audioService.downloadAudio(path);
        return blob;
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
