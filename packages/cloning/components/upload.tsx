'use client';

import { useRef } from 'react';

import { Trash2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';

import { useUpload } from '@/packages/cloning/components/cloning-provider';

export function UploadSection() {
  const { uploadedFiles, status, error, uploadFile, deleteFile } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadFile(file);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      // Error is handled by context
      console.error('Upload error:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      try {
        await uploadFile(file);
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Audio</CardTitle>
        <CardDescription>
          If you have a sample of your voice, upload it here. The sample should be at least 30
          seconds long. The audio should have only you speaking. For best results, please use a
          recording with minimal background noise.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel htmlFor="audio-upload">Audio Sample</FieldLabel>
          {uploadedFiles.length > 0 && (
            <div className="mt-2 space-y-2">
              {uploadedFiles.map(fileId => {
                // Extract filename from ID (format: local-user/upload/timestamp-filename)
                const parts = fileId.split('/');
                const filename = parts[parts.length - 1] || fileId;

                return (
                  <div
                    key={fileId}
                    className="flex items-center justify-between rounded-md bg-muted p-3"
                  >
                    <input type="hidden" name="audio-file-id" value={fileId} />
                    <span className="text-sm truncate max-w-[80%]">{filename}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteFile(fileId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          <div
            className="mt-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-10 transition-colors hover:border-muted-foreground/50"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <label
                htmlFor="audio-upload"
                className="cursor-pointer font-semibold text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
              >
                {status === 'uploading' ? 'Uploading...' : 'Upload a file'}
              </label>
              <span>or drag and drop</span>
            </div>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <p className="mt-1 text-xs text-muted-foreground">WAV, MP3, M4A up to 25MB</p>
            <input
              ref={fileInputRef}
              id="audio-upload"
              name="audio-upload"
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={handleFileUpload}
              disabled={status === 'uploading'}
            />
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}
