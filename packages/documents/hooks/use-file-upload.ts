'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import GeminiService from '@/services/gemini';
import { useAccountContext } from '@/packages/account';

export interface UseFileUploadOptions {
  onTextExtracted?: (text: string) => void;
}

export interface UseFileUploadReturn {
  // State
  uploadedFiles: File[];
  extracting: boolean;
  gemini: GeminiService;

  // Actions
  handleFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: () => Promise<void>;
  resetFiles: () => void;
}

export function useFileUpload({
  onTextExtracted,
}: UseFileUploadOptions = {}): UseFileUploadReturn {
  const { account } = useAccountContext();

  const gemini = useMemo(
    () => new GeminiService(account?.ai_providers?.gemini?.api_key || ''),
    [account?.ai_providers?.gemini?.api_key]
  );

  const [extracting, setExtracting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFilesSelected = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setUploadedFiles(files);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one file');
      return;
    }

    setExtracting(true);

    try {
      const extractedText = await gemini.extractText({ files: uploadedFiles });
      onTextExtracted?.(extractedText);
      setUploadedFiles([]); // Clear after success
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setExtracting(false);
    }
  }, [uploadedFiles, gemini, onTextExtracted]);

  const resetFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  return {
    uploadedFiles,
    extracting,
    gemini,
    handleFilesSelected,
    handleSubmit,
    resetFiles,
  };
}
