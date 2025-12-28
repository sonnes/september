'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useFileUpload } from '@/packages/documents/hooks/use-file-upload';

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
  const { uploadedFiles, extracting, handleFilesSelected, handleSubmit } = useFileUpload({
    onTextExtracted,
  });

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
