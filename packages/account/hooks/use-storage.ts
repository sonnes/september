'use client';

import { useCallback } from 'react';
import supabase from '@/supabase/client';

export function useStorage() {
  const uploadFile = useCallback(async (userId: string, file: File) => {
    const fileName = `${userId}/${file.name}`;
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        cacheControl: 'no-cache',
        upsert: true,
      });

    if (error) throw error;

    return data.path;
  }, []);

  const deleteFile = useCallback(async (path: string) => {
    const { error } = await supabase.storage.from('documents').remove([path]);
    if (error) throw error;
  }, []);

  return { uploadFile, deleteFile };
}

