'use client';

import { useState } from 'react';

import { CheckCircle2, ChevronLeft, ChevronRight, Mic, Play, Square, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';

import { cn } from '@/lib/utils';
import { useRecordingContext } from '@/packages/cloning/components/cloning-provider';

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
  } = useRecordingContext();
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex(prevIndex => (prevIndex === SAMPLE_TEXTS.length - 1 ? 0 : prevIndex + 1));
  };

  const previousSlide = () => {
    setCurrentIndex(prevIndex => (prevIndex === 0 ? SAMPLE_TEXTS.length - 1 : prevIndex - 1));
  };

  const currentSample = SAMPLE_TEXTS[currentIndex];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Now</CardTitle>
        <CardDescription>
          Record a sample of your voice by speaking the following texts. Try to speak clearly and
          slowly in a normal tone. For best results, try to record in a quiet environment.
        </CardDescription>
        <CardDescription>
          Read more about how to record a good sample{' '}
          <a
            href="https://elevenlabs.io/docs/product-guides/voices/voice-cloning/instant-voice-cloning"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            here
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel>Sample Text</FieldLabel>
          <div className="relative mt-2">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={previousSlide}
                className="rounded-full"
                aria-label="Previous sample"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              <div className="flex-1">
                <div
                  key={currentSample.id}
                  className="flex items-center justify-between rounded-lg bg-muted p-4"
                >
                  <div className="mr-4 flex-1">
                    <p className="text-md font-medium">{currentSample.text}</p>
                    <div className="mt-1 h-5">
                      {recordings[currentSample.id] && (
                        <p className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-4 w-4" /> Recorded
                        </p>
                      )}
                      {errors[currentSample.id] && (
                        <p className="text-xs text-destructive">{errors[currentSample.id]}</p>
                      )}
                      {status[currentSample.id] === 'uploading' && (
                        <p className="text-xs text-primary">Uploading...</p>
                      )}
                    </div>
                  </div>
                  <div className="flex min-w-[88px] justify-end gap-2">
                    {status[currentSample.id] === 'recording' ? (
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => stopRecording(currentSample.id)}
                      >
                        <Square className="h-5 w-5" />
                      </Button>
                    ) : status[currentSample.id] === 'playing' ? (
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => stopPlaying(currentSample.id)}
                      >
                        <Square className="h-5 w-5" />
                      </Button>
                    ) : recordings[currentSample.id] ? (
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => playRecording(currentSample.id)}
                      >
                        <Play className="h-5 w-5" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => {
                          startRecording(currentSample.id);
                        }}
                      >
                        <Mic className="h-5 w-5" />
                      </Button>
                    )}

                    {recordings[currentSample.id] && (
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => {
                          deleteRecording(currentSample.id);
                        }}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={nextSlide}
                className="rounded-full"
                aria-label="Next sample"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SAMPLE_TEXTS.map((sample, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    'h-8 w-8 rounded-full text-xs transition-colors',
                    recordings[sample.id]
                      ? 'bg-green-100 text-green-700 ring-1 ring-green-500'
                      : 'bg-muted text-muted-foreground',
                    index === currentIndex ? 'font-bold ring-2' : ''
                  )}
                  aria-label={`Go to sample ${index + 1}${recordings[sample.id] ? ' (Recorded)' : ''}`}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}
