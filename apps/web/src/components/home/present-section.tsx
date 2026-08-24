import { useEffect, useState } from 'react';

import { Play, Square } from 'lucide-react';

import { presentChunks, presentTone, roleSpec } from '@/rules/present';

import { BrandMark } from '@/components/brand';
import { NOTE_SENTENCES } from './notes-section';
import { SectionHeader } from './section-header';
import { useDemoSpeech } from './use-demo-speech';

// The note from the section above, cut by the rule the app itself uses, so
// the page shows the real chunking and not a drawing of it.
export const PRESENT_CHUNKS = presentChunks(NOTE_SENTENCES.join(' '));

const TONE = presentTone('indigo');

export function PresentSection() {
  return (
    <section className="bg-zinc-100 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)] lg:items-center">
        <SectionHeader
          eyebrow="Present"
          title="Fill the room with it, or send it as a file."
          lede="Any note goes to the whole screen, one line at a time, spoken in your voice — for the person across the table or the face on the call. The same note exports as text, as audio, or as a captioned video."
          hint="Press Present."
          accent="rose"
        />
        <PresentDemo />
      </div>
    </section>
  );
}

function PresentDemo() {
  const { speakSequence, stopSequence } = useDemoSpeech();
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => stopSequence, [stopSequence]);

  const play = () => {
    if (playing) {
      stopSequence();
      setPlaying(false);
      setCurrent(0);
      return;
    }
    setPlaying(true);
    speakSequence(PRESENT_CHUNKS.map(chunk => chunk.text), {
      onPart: index => setCurrent(index),
      onDone: () => {
        setPlaying(false);
        setCurrent(0);
      },
    });
  };

  const chunk = PRESENT_CHUNKS[current];
  const spec = roleSpec(chunk.role, TONE.family);

  return (
    <div className="overflow-hidden rounded-2xl bg-rose-50 p-4 shadow-sm ring-1 ring-rose-100">
      <div className="flex flex-wrap items-center gap-6 rounded-lg bg-white/70 p-4">
        <div
          data-present-stage
          className="relative flex aspect-[16/10] w-full flex-none flex-col justify-center overflow-hidden rounded-xl p-8 shadow-lg sm:w-80"
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
                  opacity: playing && index <= current ? 0.85 : 0.25,
                }}
              />
            ))}
          </div>

          <p
            className="relative text-balance"
            style={{
              fontFamily: spec.fontFamily,
              fontWeight: spec.fontWeight,
              fontSize: chunk.role === 'display' ? '1.5rem' : '1.05rem',
              lineHeight: spec.lineHeightRatio,
              color: chunk.role === 'display' ? TONE.display : TONE.support,
            }}
          >
            {chunk.text}
          </p>

          <BrandMark size={22} className="absolute bottom-3 left-4 opacity-80" />
        </div>

        <div className="grid min-w-40 flex-1 content-center gap-3">
          <button
            type="button"
            onClick={play}
            className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-6 text-sm font-semibold transition-[opacity,transform] hover:scale-[1.02] focus-visible:ring-2 focus-visible:outline-none active:scale-95 motion-reduce:transition-none"
          >
            {playing ? (
              <Square className="size-4" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
            {playing ? 'Stop' : 'Present'}
          </button>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Seven tones to pick from. Export saves the words, the audio, or a
            9:16 video with your voice — ready for family chats.
          </p>
        </div>
      </div>
    </div>
  );
}
