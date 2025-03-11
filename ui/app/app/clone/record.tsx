'use client';

import { useRef, useState } from 'react';

import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex(prevIndex => (prevIndex === SAMPLE_TEXTS.length - 1 ? 0 : prevIndex + 1));
  };

  const previousSlide = () => {
    setCurrentIndex(prevIndex => (prevIndex === 0 ? SAMPLE_TEXTS.length - 1 : prevIndex - 1));
  };

  const currentSample = SAMPLE_TEXTS[currentIndex];

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm ring-1 ring-zinc-950/5">
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
        <div className="relative mt-2">
          <div className="flex items-center justify-between gap-2">
            <Button
              outline
              onClick={previousSlide}
              className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
              aria-label="Previous sample"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </Button>

            <div className="flex-1">
              <div
                key={currentSample.id}
                className="p-4 bg-zinc-50 rounded-lg shadow-sm flex items-center justify-between"
              >
                <div className="flex-1 mr-4">
                  <p className="text-md font-medium text-zinc-900">{currentSample.text}</p>
                  <div className="h-5 mt-1">
                    {recordings[currentSample.id] && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircleIcon className="size-4" /> Recorded
                      </p>
                    )}
                    {errors[currentSample.id] && (
                      <p className="text-xs text-red-600">{errors[currentSample.id]}</p>
                    )}
                    {status[currentSample.id] === 'uploading' && (
                      <p className="text-xs text-blue-600">Uploading...</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 min-w-[88px] justify-end">
                  {status[currentSample.id] === 'recording' ? (
                    <Button outline type="button" onClick={() => stopRecording(currentSample.id)}>
                      <StopIcon className="h-5 w-5" />
                    </Button>
                  ) : status[currentSample.id] === 'playing' ? (
                    <Button outline type="button" onClick={() => stopPlaying(currentSample.id)}>
                      <StopIcon className="h-5 w-5" />
                    </Button>
                  ) : recordings[currentSample.id] ? (
                    <Button outline type="button" onClick={() => playRecording(currentSample.id)}>
                      <PlayIcon className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button
                      outline
                      type="button"
                      onClick={() => {
                        startRecording(currentSample.id);
                      }}
                    >
                      <MicrophoneIcon className="h-5 w-5" />
                    </Button>
                  )}

                  {recordings[currentSample.id] && (
                    <Button
                      outline
                      type="button"
                      onClick={() => {
                        deleteRecording(currentSample.id);
                      }}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Button
              outline
              onClick={nextSlide}
              className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
              aria-label="Next sample"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex justify-center mt-4 gap-2 flex-wrap">
            {SAMPLE_TEXTS.map((sample, index) => (
              <Button
                key={index}
                outline
                onClick={() => setCurrentIndex(index)}
                className={`h-8 w-8 rounded-full transition-colors flex items-center justify-center text-xs font-medium cursor-pointer
                  ${
                    index === currentIndex
                      ? 'bg-zinc-500 text-white'
                      : recordings[sample.id]
                        ? 'bg-green-100 text-green-700 ring-1 ring-green-700'
                        : 'bg-zinc-100 text-zinc-700'
                  }`}
                aria-label={`Go to sample ${index + 1}${recordings[sample.id] ? ' (Recorded)' : ''}`}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </div>
      </Field>
    </div>
  );
}
