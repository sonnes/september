'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import supabase from '@/supabase/client';
import { Alignment } from '@/packages/audio/types';
import { AudioService } from '@/packages/audio/lib/audio-service';

const audioService = new AudioService(supabase);

export interface UseUploadAudioReturn {
  uploadAudio: (params: { path: string; blob: string; alignment?: Alignment }) => Promise<string|undefined>;
}

export function useUploadAudio(): UseUploadAudioReturn {
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

export interface UseDownloadAudioReturn {
  downloadAudio: (path: string) => Promise<Blob>;
}

export function useDownloadAudio(): UseDownloadAudioReturn {
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

