'use client';

import { useCallback, useState } from 'react';

import { toast } from 'sonner';

import { extractText } from '@september/ai';
import { useAccount } from '@september/account';

export interface UseFileUploadOptions {
  onTextExtracted?: (text: string) => void;
}

export interface UseFileUploadReturn {
  // State
  uploadedFiles: File[];
  extracting: boolean;

  // Actions
  handleFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: () => Promise<void>;
  resetFiles: () => void;
}

export function useFileUpload({
  onTextExtracted,
}: UseFileUploadOptions = {}): UseFileUploadReturn {
  const { account } = useAccount();

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
      const apiKey = account?.ai_providers?.gemini?.api_key ?? '';
      const extractedText = await extractText(apiKey, uploadedFiles);
      onTextExtracted?.(extractedText);
      setUploadedFiles([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setExtracting(false);
    }
  }, [uploadedFiles, account?.ai_providers?.gemini?.api_key, onTextExtracted]);

  const resetFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  return {
    uploadedFiles,
    extracting,
    handleFilesSelected,
    handleSubmit,
    resetFiles,
  };
}
