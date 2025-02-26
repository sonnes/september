'use client';

import { useRef, useState } from 'react';

import {
  CheckCircleIcon,
  MicrophoneIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/catalyst/button';
import { Field, Label } from '@/components/catalyst/fieldset';
import { Heading } from '@/components/catalyst/heading';

import { useRecording } from './context';

export const SAMPLE_TEXTS = [
  { id: 'birch-canoe', text: 'The birch canoe slid on the smooth planks.' },
  { id: 'glue-sheet', text: 'Glue the sheet to the dark blue background.' },
  { id: 'chicken-leg', text: 'These days a chicken leg is a rare dish.' },
  { id: 'lemon-juice', text: 'The juice of lemons makes fine punch.' },
  { id: 'salt-breeze', text: 'The salt breeze came across from the sea.' },
  { id: 'beauty-view', text: 'The beauty of the view stunned the young boy.' },
  { id: 'pearl-ring', text: 'The pearl was worn in a thin silver ring.' },
  { id: 'fruit-peel', text: 'The fruit peel was cut in thick slices.' },
  { id: 'pound-sugar', text: 'A pound of sugar costs more than eggs.' },
  { id: 'oak-shade', text: 'Oak is strong and also gives shade.' },
];

export function RecordingSection() {
  const {
    recordings,
    startRecording,
    stopRecording,
    deleteRecording,
    playRecording,
    stopPlaying,
    status,
    errors,
  } = useRecording();

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/5">
      <Heading level={4}>Record Now</Heading>
      <p className="text-sm text-zinc-500 mt-2 mb-6">
        Record a sample of your voice by speaking the following texts. Try to speak clearly and
        slowly in a normal tone. For best results, try to record in a quiet environment.
      </p>
      <p className="text-sm text-zinc-500 mt-2 mb-6">
        Read more about how to record a good sample{' '}
        <a
          href="https://elevenlabs.io/docs/product-guides/voices/voice-cloning/instant-voice-cloning"
          target="_blank"
          rel="noopener noreferrer"
        >
          here
        </a>
      </p>

      <Field>
        <div className="space-y-4 mt-2">
          {SAMPLE_TEXTS.map(({ id, text }) => {
            const thisStatus = status[id];
            return (
              <div
                key={id}
                className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg shadow-sm flex items-center justify-between"
              >
                <div className="flex-1 mr-4">
                  <p className="text-md font-medium text-zinc-900 dark:text-white">{text}</p>
                  <div className="h-5 mt-1">
                    {recordings[id] && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircleIcon className="size-4" /> Recorded
                      </p>
                    )}
                    {errors[id] && <p className="text-xs text-red-600">{errors[id]}</p>}
                    {thisStatus === 'uploading' && (
                      <p className="text-xs text-blue-600">Uploading...</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 min-w-[88px] justify-end">
                  {thisStatus === 'recording' ? (
                    <Button outline type="button" onClick={() => stopRecording(id)}>
                      <StopIcon className="h-5 w-5" />
                    </Button>
                  ) : thisStatus === 'playing' ? (
                    <Button outline type="button" onClick={() => stopPlaying(id)}>
                      <StopIcon className="h-5 w-5" />
                    </Button>
                  ) : recordings[id] ? (
                    <Button outline type="button" onClick={() => playRecording(id)}>
                      <PlayIcon className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button
                      outline
                      type="button"
                      onClick={() => {
                        startRecording(id);
                      }}
                    >
                      <MicrophoneIcon className="h-5 w-5" />
                    </Button>
                  )}

                  {recordings[id] && (
                    <Button
                      outline
                      type="button"
                      onClick={() => {
                        deleteRecording(id);
                      }}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Field>
    </div>
  );
}
