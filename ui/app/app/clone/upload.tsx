'use client';

import { CloudArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { Field, Label } from '@/components/catalyst/fieldset';
import { Heading } from '@/components/catalyst/heading';

import { useUpload } from './context';

export function UploadSection() {
  const { uploadedFiles, status, error, uploadFile, deleteFile } = useUpload();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadFile(file);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/5">
      <Heading level={4}>Upload Audio</Heading>
      <p className="text-sm text-zinc-500 mt-2 mb-6">
        If you have a sample of your voice, upload it here. The sample should be at least 30 seconds
        long. The audio should have only you speaking. For best results, please use a recording with
        minimal background noise.
      </p>
      <Field>
        <Label htmlFor="audio-upload">Audio Sample</Label>
        {uploadedFiles.length > 0 && (
          <div className="mt-2">
            <ul className="space-y-2">
              {uploadedFiles.map(filePath => (
                <li
                  key={filePath}
                  className="flex items-center justify-between rounded-md bg-zinc-50 dark:bg-zinc-800 p-3"
                >
                  <input type="hidden" name="audio-file-path" value={filePath} />
                  <span className="text-sm truncate max-w-[80%]">{filePath.split('/').pop()}</span>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-md bg-red-50 dark:bg-red-900/50 px-2 py-1 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/75"
                    onClick={() => deleteFile(filePath)}
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
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
                <span>{status === 'uploading' ? 'Uploading...' : 'Upload a file'}</span>
                <input
                  id="audio-upload"
                  name="audio-upload"
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  onChange={handleFileUpload}
                  disabled={status === 'uploading'}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            <p className="text-xs/5 text-zinc-600 dark:text-zinc-400 mt-1">
              WAV, MP3, M4A up to 25MB
            </p>
          </div>
        </div>
      </Field>
    </div>
  );
}
