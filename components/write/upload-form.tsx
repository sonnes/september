'use client';

import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import FileUploader from '@/components/ui/file-uploader';
import { useToast } from '@/hooks/use-toast';
import GeminiService from '@/services/gemini';

import { useAccountContext } from '../../services/account/context';

export default function UploadForm({
  onTextExtracted,
}: {
  onTextExtracted: (text: string) => void;
}) {
  const { showError } = useToast();
  const { account } = useAccountContext();

  const gemini = new GeminiService(account?.gemini_api_key || '');

  const [extracting, setExtracting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFilesUploaded = (files: File[]) => {
    setUploadedFiles(files);
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      showError('Please upload at least one file');
      return;
    }

    setExtracting(true);

    try {
      const extractedText = await gemini.extractText({ files: uploadedFiles });

      onTextExtracted(extractedText);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      showError(errorMessage);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <>
      <FileUploader
        onUpload={handleFilesUploaded}
        accept="*"
        previewClassName="w-24 h-24 object-cover rounded border"
        showPreviews={true}
      />

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={uploadedFiles.length === 0 || extracting}
          className="px-6"
        >
          {extracting ? 'Extracting...' : 'Extract Text'}
        </Button>
      </div>
    </>
  );
}
