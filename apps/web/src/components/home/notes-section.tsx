import { useEffect, useState } from 'react';

import { Download, Play, Square } from 'lucide-react';

import { presentChunks, presentTone, roleSpec } from '@/rules/present';

import { BrandMark } from '@/components/brand';
import { SectionHeader } from './section-header';
import { useDemoSpeech } from './use-demo-speech';

// One note carries the whole chapter: it is read aloud sentence by sentence,
// then the same words go to the stage, chunk by chunk.
export const NOTE_TITLE = 'Bedtime story — the island adventure';

export const NOTE_SENTENCES: readonly string[] = [
  'The four of them rowed out to the island, with Scout barking at the waves.',
  'Inside the cave, Jo’s torch lit up an old wooden chest.',
  '“Treasure,” whispered Ben.',
  '“Real treasure!”',
  'But behind them, something moved in the dark…',
];

// The note above, cut by the rule the app itself uses, so the page shows the
// real chunking and not a drawing of it.
export const PRESENT_CHUNKS = presentChunks(NOTE_SENTENCES.join(' '));

const TONE = presentTone('indigo');

const EXPORTS = ['Text (.md)', 'Audio (.mp3)', 'Captioned video (.mp4)'];

export function NotesSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)] lg:items-center">
        <div className="order-2 lg:order-1">
          <NotesDemo />
        </div>
        <div className="order-1 lg:order-2">
          <SectionHeader
            eyebrow="Notes & Present"
            title="Longer thoughts, ready ahead of time."
            lede="Write a toast, an update for the doctor, or a bedtime story for the kids — inside the space it belongs to. September reads it aloud in your voice, sentence by sentence. Then fill the room with it, or send it as a file."
            hint="Press Play — then Present takes the whole screen."
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
  const [chunk, setChunk] = useState(0);
  const [presenting, setPresenting] = useState(false);

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

  const present = () => {
    if (presenting) {
      stopSequence();
      setPresenting(false);
      setChunk(0);
      return;
    }
    setPresenting(true);
    speakSequence(
      PRESENT_CHUNKS.map(one => one.text),
      {
        onPart: index => setChunk(index),
        onDone: () => {
          setPresenting(false);
          setChunk(0);
        },
      }
    );
  };

  const current = PRESENT_CHUNKS[chunk];
  const spec = roleSpec(current.role, TONE.family);

  return (
    <div className="overflow-hidden rounded-2xl bg-violet-50 p-4 shadow-lg ring-1 ring-violet-100">
      <div className="grid gap-5 rounded-xl border bg-white p-5">
        <div>
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
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PlayButton onClick={play} active={speaking !== null} label="Play voice-over" />
          <PlayButton onClick={present} active={presenting} label="Present" variant="outline" />
        </div>

        {/* The stage: the same words, one chunk at a time, in the default tone. */}
        <div
          data-present-stage
          className="relative flex aspect-[16/10] w-full flex-col justify-center overflow-hidden rounded-xl p-8 shadow-lg"
          style={{ backgroundColor: TONE.background }}
        >
          {/* One segment for each chunk, as on the stage itself. */}
          <div className="absolute top-3 right-4 left-4 flex gap-1">
            {PRESENT_CHUNKS.map((one, index) => (
              <span
                key={one.text}
                className="h-[2.5px] flex-1 rounded-full transition-opacity"
                style={{
                  backgroundColor: TONE.display,
                  opacity: presenting && index <= chunk ? 0.85 : 0.25,
                }}
              />
            ))}
          </div>

          <p
            className="relative text-balance"
            style={{
              fontFamily: spec.fontFamily,
              fontWeight: spec.fontWeight,
              fontSize: current.role === 'display' ? '1.5rem' : '1.05rem',
              lineHeight: spec.lineHeightRatio,
              color: current.role === 'display' ? TONE.display : TONE.support,
            }}
          >
            {current.text}
          </p>

          <BrandMark size={22} className="absolute bottom-3 left-4 opacity-80" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {EXPORTS.map(format => (
            <span
              key={format}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm font-medium text-zinc-600"
            >
              <Download className="size-3.5 opacity-60" aria-hidden="true" />
              {format}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayButton({
  onClick,
  active,
  label,
  variant = 'solid',
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  variant?: 'solid' | 'outline';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold transition-[opacity,transform] hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
        variant === 'solid'
          ? 'bg-primary text-primary-foreground'
          : 'border border-primary/40 bg-card text-foreground hover:bg-primary/5'
      }`}
    >
      {active ? (
        <Square className="size-4" aria-hidden="true" />
      ) : (
        <Play className="size-4" aria-hidden="true" />
      )}
      {active ? 'Stop' : label}
    </button>
  );
}
