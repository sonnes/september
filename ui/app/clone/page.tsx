'use client';

import { useState } from 'react';

import { CloudArrowUpIcon, MicrophoneIcon } from '@heroicons/react/24/outline';

import { Banner } from '@/components/banner';
import { Button } from '@/components/catalyst/button';
import { Field, Label } from '@/components/catalyst/fieldset';
import { Heading } from '@/components/catalyst/heading';
import { Input } from '@/components/catalyst/input';
import SingleColumnLayout from '@/components/layouts/single-column';

import { RecordingSection } from './recording';

function VoiceCloneForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [recordings, setRecordings] = useState<Record<string, Blob>>({});

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        alert('Please upload an audio file');
        event.target.value = '';
        return;
      }
      setAudioFile(file);
    }
  };

  const encodeFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/wav;base64,")
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        alert('Please upload an audio file');
        return;
      }
      setAudioFile(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const formData = {
        name,
        description,
        audioData: audioFile ? await encodeFileToBase64(audioFile) : null,
        recordings: await Promise.all(
          Object.values(recordings).map(
            async blob =>
              await encodeFileToBase64(
                new File([blob], `recording-${Date.now()}.webm`, {
                  type: 'audio/webm',
                })
              )
          )
        ),
      };

      const response = await fetch('/api/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to clone voice');
      }

      const data = await response.json();
      setStatus({
        type: 'success',
        message: 'Voice clone created successfully!',
      });
      // Optionally redirect to the voices page or clear the form
    } catch (error) {
      if (error instanceof Error) {
        setStatus({
          type: 'error',
          message: error.message || 'Failed to clone voice',
        });
      } else {
        setStatus({
          type: 'error',
          message: 'An unknown error occurred',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearStatus = () => {
    setStatus({ type: null, message: '' });
  };

  return (
    <div className="p-6">
      {status.type && (
        <div className="mb-6">
          <Banner
            type={status.type}
            title={status.type === 'success' ? 'Success' : 'Error'}
            message={status.message}
            onDismiss={clearStatus}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-start">
          {/* Upload Section */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/5">
            <Heading level={3}>Upload Audio</Heading>
            <p className="text-md text-zinc-500 mt-2 mb-6">
              If you have a sample of your voice, upload it here. The sample should be at least 30
              seconds long. The audio should have only you speaking. For best results, please use a
              recording with minimal background noise.
            </p>
            <Field>
              <Label htmlFor="audio-upload">Audio Sample</Label>
              <div
                className={`mt-2 flex justify-center rounded-lg border-2 border-dashed px-6 py-10
                  ${
                    isDragging
                      ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
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
                      <span>Upload a file</span>
                      <input
                        id="audio-upload"
                        name="audio-upload"
                        type="file"
                        accept="audio/*"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs/5 text-zinc-600 dark:text-zinc-400 mt-1">
                    WAV, MP3, M4A up to 25MB
                  </p>
                  {audioFile && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-4">
                      Selected: {audioFile.name}
                    </p>
                  )}
                </div>
              </div>
            </Field>
          </div>

          {/* Divider */}
          <div className="flex md:flex-col items-center justify-center h-full">
            {/* Vertical divider (desktop) */}
            <div className="hidden md:flex flex-col items-center justify-center h-full w-full min-h-[400px]">
              <div className="flex-1 w-px bg-zinc-200 dark:bg-zinc-800" />
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-full p-4">
                <span className="text-zinc-600 dark:text-zinc-500 text-lg font-medium">OR</span>
              </div>
              <div className="flex-1 w-px bg-zinc-200 dark:bg-zinc-800" />
            </div>

            {/* Horizontal divider (mobile) */}
            <div className="md:hidden w-full flex items-center gap-4 py-4">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-full p-4">
                <span className="text-zinc-600 dark:text-zinc-500 text-lg font-medium">OR</span>
              </div>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>

          {/* Record Section */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/5">
            <Heading level={3}>Record Now</Heading>
            <p className="text-md text-zinc-500 mt-2 mb-6">
              Record a sample of your voice by speaking the following texts. Try to speak clearly
              and slowly in a normal tone. For best results, try to record in a quiet environment.
            </p>
            <RecordingSection onRecordingsChange={setRecordings} />
          </div>
        </div>

        {/* Common Fields */}
        <div className="max-w-xl mx-auto bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/5">
          <Field>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="The name that identifies this voice."
            />
          </Field>

          <Field className="mt-4">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="How would you describe the voice?"
            />
          </Field>

          <Button type="submit" color="blue" className="w-full mt-6" disabled={isLoading}>
            {isLoading ? 'Creating Voice Clone...' : 'Create Voice Clone'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ClonePage() {
  return (
    <SingleColumnLayout title="Voice Cloning" color="blue">
      <div className="flex flex-col h-[calc(100vh-288px)]">
        <VoiceCloneForm />
      </div>
    </SingleColumnLayout>
  );
}
