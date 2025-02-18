'use client';

import { useState } from 'react';
import { useActionState } from 'react';

import { CloudArrowUpIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { Banner } from '@/components/banner';
import { Button } from '@/components/catalyst/button';
import { Field, Label } from '@/components/catalyst/fieldset';
import { Heading } from '@/components/catalyst/heading';
import { Input } from '@/components/catalyst/input';
import { useAccount } from '@/components/context/auth';

import { type CloneVoiceResponse, cloneVoice } from './actions';
import { RecordingSection } from './recording';

const initialState: CloneVoiceResponse = {
  success: false,
  message: '',
  inputs: {
    name: 'Ravi',
    description: 'A voice clone of Ravi',
    audioFile: null,
    recordings: '',
  },
};

export default function VoiceCloneForm() {
  const [state, formAction, isPending] = useActionState(cloneVoice, initialState);
  const [recordings, setRecordings] = useState(state.inputs?.recordings);
  const { account } = useAccount();

  return (
    <div>
      {state.message && (
        <div className="mb-6">
          <Banner
            type={state.success ? 'success' : 'error'}
            title={state.success ? 'Success' : 'Error'}
            message={state.message}
          />
        </div>
      )}

      <form action={formAction} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-start">
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
                      <span>Upload a file</span>
                      <input
                        id="audio-upload"
                        name="audio-upload"
                        type="file"
                        accept="audio/*"
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs/5 text-zinc-600 dark:text-zinc-400 mt-1">
                    WAV, MP3, M4A up to 25MB
                  </p>
                  {state.inputs?.audioFile && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-4">
                      Selected: {state.inputs.audioFile.name}
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
            <p className="text-md text-zinc-500 mt-2 mb-6">
              Read more about how to record a good sample{' '}
              <a
                href="https://elevenlabs.io/docs/product-guides/voices/voice-cloning/instant-voice-cloning"
                target="_blank"
                rel="noopener noreferrer"
              >
                here
              </a>
            </p>
            <input type="hidden" name="recordings" value={recordings} />
            <RecordingSection
              onRecordingsChange={newRecordings => setRecordings(JSON.stringify(newRecordings))}
            />
          </div>
        </div>

        {/* Common Fields */}
        {!account.approved && (
          <div className="max-w-xl mx-auto text-center bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/5">
            <Heading level={3}>You are on the waitlist</Heading>
          </div>
        )}
        {account.approved && (
          <div className="max-w-xl mx-auto bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/5">
            <Field>
              <Label>Name</Label>
              <Input
                name="name"
                defaultValue={state.inputs?.name}
                required
                placeholder="The name that identifies this voice."
              />
              {state.errors?.name && (
                <p className="mt-2 text-sm text-red-500">{state.errors.name.join(', ')}</p>
              )}
            </Field>

            <Field className="mt-4">
              <Label>Description</Label>
              <Input
                name="description"
                defaultValue={state.inputs?.description}
                placeholder="How would you describe the voice?"
              />
              {state.errors?.description && (
                <p className="mt-2 text-sm text-red-500">{state.errors.description.join(', ')}</p>
              )}
            </Field>

            <Button type="submit" color="blue" className="w-full mt-6" disabled={isPending}>
              {isPending ? 'Creating Voice Clone...' : 'Create Voice Clone'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
