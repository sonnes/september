'use client';

import { useState } from 'react';

import { CheckCircleIcon, CloudArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { Field, Label } from '@/components/catalyst/fieldset';
import { Heading } from '@/components/catalyst/heading';
import { useAuth } from '@/components/context/auth';
import { createClient } from '@/supabase/client';

export function UploadSection() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [audioFilePath, setAudioFilePath] = useState<string | null>(null);

  const supabase = createClient();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File size must be less than 25MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileName = `${user?.id}/${file.name}`;

      const { data, error } = await supabase.storage.from('voice_samples').upload(fileName, file, {
        cacheControl: 'no-cache',
        upsert: true,
      });

      if (error) throw error;

      setAudioFilePath(data.path);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAudio = async () => {
    if (!audioFilePath) return;

    try {
      const { error } = await supabase.storage.from('voice_samples').remove([audioFilePath]);

      if (error) throw error;

      setAudioFilePath(null);
    } catch (error) {
      console.error('Failed to delete audio file:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/5">
      <Heading level={3}>Upload Audio</Heading>
      <p className="text-md text-zinc-500 mt-2 mb-6">
        If you have a sample of your voice, upload it here. The sample should be at least 30 seconds
        long. The audio should have only you speaking. For best results, please use a recording with
        minimal background noise.
      </p>
      <Field>
        <Label htmlFor="audio-upload">Audio Sample</Label>
        {audioFilePath ? (
          <div className="mt-2 flex items-center gap-4">
            <input type="hidden" name="audio-file-path" value={audioFilePath} />
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircleIcon className="size-5" />
              <span className="text-sm">Audio uploaded successfully</span>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 rounded-md bg-red-50 dark:bg-red-900/50 px-2 py-1 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/75"
              onClick={handleDeleteAudio}
            >
              <TrashIcon className="size-4" />
              Delete Audio
            </button>
          </div>
        ) : (
          <div
            className={clsx(
              'mt-2 flex justify-center rounded-lg border-2 border-dashed px-6 py-10',
              'border-zinc-200 dark:border-zinc-800'
            )}
          >
            <div className="text-center">
              <CloudArrowUpIcon
                aria-hidden="true"
                className="mx-auto size-12 text-zinc-300 dark:text-zinc-600"
              />
              <div className="mt-4 flex text-sm/6 text-zinc-600 dark:text-zinc-400">
                <label
                  htmlFor="audio-upload"
                  className="relative cursor-pointer rounded-md font-semibold text-blue-600 dark:text-blue-400 
                    focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 
                    focus-within:ring-offset-2 hover:text-blue-500"
                >
                  <span>{isUploading ? 'Uploading...' : 'Upload a file'}</span>
                  <input
                    id="audio-upload"
                    name="audio-upload"
                    type="file"
                    accept="audio/*"
                    className="sr-only"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              {uploadError && <p className="mt-2 text-sm text-red-500">{uploadError}</p>}
              <p className="text-xs/5 text-zinc-600 dark:text-zinc-400 mt-1">
                WAV, MP3, M4A up to 25MB
              </p>
            </div>
          </div>
        )}
      </Field>
    </div>
  );
}
