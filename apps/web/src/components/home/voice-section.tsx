import { useEffect, useState } from 'react';

import { Link } from '@tanstack/react-router';
import { Mic, Play, Plus } from 'lucide-react';

import { type DemoVoice, useDemoSpeech } from './use-demo-speech';

const PREVIEW_TEXT = 'I’ve changed my mind. Let’s take the scenic route.';

export function VoiceSection() {
  return (
    <details className="group border-t border-zinc-200 last:border-b">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-6 py-7 focus-visible:outline-offset-4 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <div className="grid flex-1 gap-3 lg:grid-cols-[12rem_1fr] lg:gap-8">
          <p className="text-sm font-semibold text-indigo-600">Your voice</p>
          <div>
            <h2 className="text-xl font-semibold leading-snug tracking-tight text-zinc-950 sm:text-2xl">
              Keep your own voice.
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-600">
              Clone your voice from a 30-second recording, even an old home video. Use it for
              messages, notes, and presentations.
            </p>
          </div>
        </div>
        <Plus className="size-6 shrink-0 text-indigo-600 group-open:rotate-45" aria-hidden="true" />
      </summary>
      <div className="mx-auto max-w-3xl pb-10">
        <p className="mb-5 text-sm font-medium text-indigo-700">
          Cloning happens in the app — preview a starting voice below.
        </p>
        <VoiceDemo />
      </div>
    </details>
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
    <div className="overflow-hidden rounded-surface border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="grid gap-4 rounded-lg bg-white/70 p-4">
        {/* Cloning is the feature — the card leads with it. */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-indigo-50">
            <Mic className="size-5 text-indigo-600" aria-hidden="true" />
          </span>
          <div className="min-w-48 flex-1">
            <p className="font-semibold text-zinc-950">Clone your voice</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">
              Use a 30-second recording of yourself, or audio from an old home video.
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
