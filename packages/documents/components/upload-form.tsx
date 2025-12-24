'use client';

import { useMemo, useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import GeminiService from '@/services/gemini';

import { useAccountContext } from '@/packages/account';

type UploadFormProps = {
  onTextExtracted: (text: string) => void;
};

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, index);
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[index]}`;
}

export function UploadForm({ onTextExtracted }: UploadFormProps) {
  const { account } = useAccountContext();

  const gemini = useMemo(
    () => new GeminiService(account?.ai_providers?.gemini?.api_key || ''),
    [account?.ai_providers?.gemini?.api_key]
  );

  const [extracting, setExtracting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setUploadedFiles(files);
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one file');
      return;
    }

    setExtracting(true);

    try {
      const extractedText = await gemini.extractText({ files: uploadedFiles });
      onTextExtracted(extractedText);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="document-upload">Files</Label>
        <Input
          id="document-upload"
          type="file"
          multiple
          accept="*/*"
          onChange={handleFilesSelected}
          aria-describedby="document-upload-helper"
        />
        <p id="document-upload-helper" className="text-xs text-muted-foreground">
          We use Gemini to extract text from your uploads and append it to this document.
        </p>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border bg-muted/40 p-3">
          <div className="text-xs font-medium text-muted-foreground">Selected files</div>
          <div className="space-y-2">
            {uploadedFiles.map(file => (
              <div
                key={`${file.name}-${file.size}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate" title={file.name}>
                  {file.name}
                </span>
                <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={uploadedFiles.length === 0 || extracting}
        >
          {extracting ? 'Extracting...' : 'Extract text'}
        </Button>
      </div>
    </div>
  );
}
