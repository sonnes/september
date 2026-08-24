import { useEffect, useState } from 'react';

import { Play, Square } from 'lucide-react';

import { SectionHeader } from './section-header';
import { useDemoSpeech } from './use-demo-speech';

// The story the Present section puts on the stage — one narrative thread
// from the note to the room.
export const NOTE_TITLE = 'How we met — for the grandkids';

export const NOTE_SENTENCES: readonly string[] = [
  'It was the summer of ’89.',
  'Your grandmother rode a red bicycle, racing me all the way to the lake.',
  'She won, and I never stood a chance again.',
  'That’s how we met.',
];

export function NotesSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)] lg:items-center">
        <div className="order-2 lg:order-1">
          <NotesDemo />
        </div>
        <div className="order-1 lg:order-2">
          <SectionHeader
            eyebrow="Notes"
            title="Longer thoughts, ready ahead of time."
            lede="Write a toast, an update for the doctor, or a story for the grandkids — inside the space it belongs to. When the moment comes, September reads it aloud in your voice, sentence by sentence."
            hint="Press Play — the note is read aloud as each sentence lights up."
            accent="violet"
          />
        </div>
      </div>
    </section>
  );
}

function NotesDemo() {
  const { speakSequence, stopSequence } = useDemoSpeech();
  // Index of the sentence being spoken; null when idle.
  const [speaking, setSpeaking] = useState<number | null>(null);

  useEffect(() => stopSequence, [stopSequence]);

  const play = () => {
    if (speaking !== null) {
      stopSequence();
      setSpeaking(null);
      return;
    }
    speakSequence([...NOTE_SENTENCES], {
      onPart: index => setSpeaking(index),
      onDone: () => setSpeaking(null),
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-violet-50 p-4 shadow-sm ring-1 ring-violet-100">
      <div className="rounded-xl border bg-white p-5">
        <p className="text-title font-semibold text-zinc-950">{NOTE_TITLE}</p>
        <p className="mt-3 text-base leading-relaxed text-zinc-700">
          {NOTE_SENTENCES.map((sentence, index) => (
            <span key={sentence}>
              <span
                data-spoken={index === speaking ? 'true' : undefined}
                className={
                  index === speaking
                    ? 'rounded-md bg-accent px-0.5 text-accent-foreground transition-colors'
                    : 'transition-colors'
                }
              >
                {sentence}
              </span>{' '}
            </span>
          ))}
        </p>
        <button
          type="button"
          onClick={play}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-[opacity,transform] hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          {speaking !== null ? (
            <Square className="size-4" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
          {speaking !== null ? 'Stop' : 'Play voice-over'}
        </button>
      </div>
    </div>
  );
}
