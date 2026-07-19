import { useEffect, useMemo, useState } from 'react';

import { Play, Square } from 'lucide-react';

import {
  REEL_GRAIN_SVG,
  REEL_VIGNETTE_GRADIENT,
  ROLE_SPECS,
  WATERMARK_TEXT,
  captionRoles,
  ensureReelFonts,
  reelPair,
} from '@/packages/notes';
import type { ReelCaption } from '@/packages/notes';

import { SectionHeader } from './section-header';
import { useDemoSpeech } from './use-demo-speech';

// The notes-section story, chunked the way the reel exporter would cut it —
// the page's note → reel thread stays one narrative.
export const REEL_CAPTIONS: readonly string[] = [
  'The summer of ’89.',
  'Your grandmother,',
  'on a red bicycle,',
  'racing me to the lake.',
  'She won.',
  'That’s how we met.',
];

const PAIR = reelPair('stone');

/** Minimal ReelCaption shells so the real role derivation runs on demo text. */
function toCaptions(chunks: readonly string[]): ReelCaption[] {
  return chunks.map(chunk => ({
    startTime: 0,
    endTime: 0,
    words: chunk.split(' ').map(text => ({ text, startTime: 0, endTime: 0 })),
  }));
}

export function ReelsSection() {
  return (
    <section className="bg-zinc-100 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)] lg:items-center">
        <SectionHeader
          eyebrow="Reels"
          title="Turn a note into something you can share."
          lede="Any note can become a short captioned video — your words in your voice, in an editorial style made for sending to the people who are far away."
          hint="Press play on the reel."
          accent="rose"
        />
        <ReelDemo />
      </div>
    </section>
  );
}

function ReelDemo() {
  const { speakSequence, stopSequence } = useDemoSpeech();
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  // The serif display face is loaded only for this frame, as in the app.
  useEffect(() => {
    void ensureReelFonts().catch(() => {});
    return stopSequence;
  }, [stopSequence]);

  const roles = useMemo(() => captionRoles(toCaptions(REEL_CAPTIONS)), []);

  const play = () => {
    if (playing) {
      stopSequence();
      setPlaying(false);
      setCurrent(0);
      return;
    }
    setPlaying(true);
    speakSequence([...REEL_CAPTIONS], {
      onPart: index => setCurrent(index),
      onDone: () => {
        setPlaying(false);
        setCurrent(0);
      },
    });
  };

  const role = roles[current];
  const spec = ROLE_SPECS[role];

  return (
    <div className="overflow-hidden rounded-2xl bg-rose-50 p-4 shadow-sm ring-1 ring-rose-100">
      <div className="flex flex-wrap items-center gap-6 rounded-lg bg-white/70 p-4">
        <div
          className="relative flex aspect-[9/16] w-56 flex-none flex-col justify-center overflow-hidden rounded-xl p-6 shadow-lg"
          style={{ backgroundColor: PAIR.bg }}
        >
          {/* Vignette + film grain — composed exactly as the story player does
              (one layer; the grain SVG bakes in its own opacity). */}
          <div
            aria-hidden="true"
            data-reel-chrome
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `${REEL_VIGNETTE_GRADIENT}, url("${REEL_GRAIN_SVG}")`,
            }}
          />

          {/* Segmented progress */}
          <div className="absolute left-4 right-4 top-3 flex gap-1">
            {REEL_CAPTIONS.map((chunk, index) => (
              <span
                key={chunk}
                className="h-0.5 flex-1 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    playing && index <= current ? PAIR.support : 'rgba(255,255,255,0.25)',
                }}
              />
            ))}
          </div>

          <p
            className="relative leading-tight"
            style={{
              fontFamily: spec.fontFamily,
              fontWeight: spec.fontWeight,
              fontSize: role === 'display' ? '1.6rem' : '1rem',
              color: role === 'display' ? PAIR.display : PAIR.support,
            }}
          >
            {REEL_CAPTIONS[current]}
          </p>

          <span
            className="absolute bottom-3 left-0 right-0 text-center text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {WATERMARK_TEXT}
          </span>
        </div>

        <div className="grid min-w-40 flex-1 content-center gap-3">
          <button
            type="button"
            onClick={play}
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-[opacity,transform] hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            {playing ? (
              <Square className="size-4" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
            {playing ? 'Stop' : 'Play reel'}
          </button>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Exports as an MP4 with captions and your voice — ready for family chats.
          </p>
        </div>
      </div>
    </div>
  );
}
