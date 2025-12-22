'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import supabase from '@/supabase/client';
import { Alignment } from '../types';
import { AudioService } from '../lib/audio-service';

const audioService = new AudioService(supabase);

export function useUploadAudio() {
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
      const blob = await audioService.downloadAudio(path);
      return blob;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download audio');
      console.error(error);
      throw error;
    }
  }, []);

  return { downloadAudio };
}

