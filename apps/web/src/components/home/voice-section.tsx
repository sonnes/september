import { useEffect, useState } from 'react';

import { Link } from '@tanstack/react-router';

import { Mic, Play } from 'lucide-react';

import { SectionHeader } from './section-header';
import { type DemoVoice, useDemoSpeech } from './use-demo-speech';

const PREVIEW_TEXT = 'Hello — this is how September can sound.';

export function VoiceSection() {
  return (
    <section className="bg-zinc-100 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)] lg:items-center">
        <SectionHeader
          eyebrow="Your voice"
          title="Keep your own voice."
          lede="Clone your voice from a 30-second recording — even from an old home video — and September speaks as you. Every message, note voice-over, and presentation comes out in your voice, not a machine’s."
          hint="Cloning happens in the app — preview a starting voice below."
          accent="emerald"
        />
        <VoiceDemo />
      </div>
    </section>
  );
}

function VoiceDemo() {
  const { speak, listVoices } = useDemoSpeech();
  const [voices, setVoices] = useState<DemoVoice[]>([]);
  const [selected, setSelected] = useState(0);

  // Browser voices load lazily; re-list when the engine announces them.
  useEffect(() => {
    let active = true;
    const load = () => {
      void listVoices().then(result => {
        if (active && result.length > 0) setVoices(result);
      });
    };
    load();
    const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    synthesis?.addEventListener?.('voiceschanged', load);
    return () => {
      active = false;
      synthesis?.removeEventListener?.('voiceschanged', load);
    };
  }, [listVoices]);

  return (
    <div className="overflow-hidden rounded-2xl bg-emerald-50 p-4 shadow-sm ring-1 ring-emerald-100">
      <div className="grid gap-4 rounded-lg bg-white/70 p-4">
        {/* Cloning is the feature — the card leads with it. */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-white p-5 shadow-sm">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-100">
            <Mic className="size-5 text-emerald-700" aria-hidden="true" />
          </span>
          <div className="min-w-48 flex-1">
            <p className="font-semibold text-zinc-950">Clone your voice</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">
              A 30-second recording is enough. Losing your speech? An old video of you talking
              works too.
            </p>
          </div>
          <Link
            to="/welcome"
            className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Start cloning
          </Link>
        </div>

        {/* Working preview: the natural voices already on this device. */}
        <div className="flex flex-wrap items-center gap-3">
          <p className="w-full text-sm text-muted-foreground">
            Until then, start with a natural voice from this device:
          </p>
          {voices.length > 0 ? (
            <select
              value={selected}
              onChange={event => setSelected(Number(event.target.value))}
              aria-label="Choose a voice"
              className="h-11 min-w-56 flex-1 rounded-control border border-input bg-background px-3 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {voices.map((voice, index) => (
                <option key={voice.id} value={index}>
                  {voice.name} ({voice.language})
                </option>
              ))}
            </select>
          ) : (
            <p className="flex-1 text-sm text-muted-foreground">
              No voices available in this browser
            </p>
          )}
          <button
            type="button"
            onClick={() => speak(PREVIEW_TEXT, voices[selected])}
            disabled={voices.length === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:enabled:bg-accent disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Play className="size-4" aria-hidden="true" />
            Hear it
          </button>
        </div>
      </div>
    </div>
  );
}
