import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@september/ui';
import {
  ChevronsRight,
  Delete,
  Headphones,
  History,
  PanelLeft,
  PanelRight,
  Pin,
  Plus,
  Sparkles,
  Trash2,
  Undo2,
  Volume2,
} from 'lucide-react';

import { type SuggestionSource, joinTokens, matchTyped, stripeForText } from '@/rules/stripes';

import { useDemoSpeech } from './use-demo-speech';

// Seed one spoken message so the transcript reads as live, not a screenshot.
const DEMO_TRANSCRIPT: string[] = ['That reminds me.', 'I liked the villain more than the hero.'];

// The demo shows a conversation with opinions and room to change direction.
const DEMO_PINNED = ['Tell me more.', 'Plot twist!'];

export const LANDING_SPACE_SEED = {
  title: 'Friends',
  phrases: [
    { text: 'I have a better idea.', source: 'md' },
    { text: 'That reminds me.', source: 'history' },
    { text: 'I had a feeling about that.', source: 'llm' },
  ],
} as const;

export interface LandingStripe {
  text: string;
  tokens: string[];
  hidden: number;
  source: SuggestionSource;
  code?: string;
  /** The tokens that the typed words found inside the row, as [start, end). */
  found?: [number, number];
}

const DEMO_SUGGESTIONS: readonly { text: string; source: SuggestionSource }[] =
  LANDING_SPACE_SEED.phrases;

export function LiveDemoSection() {
  return (
    <section id="features" className="scroll-mt-4 bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] lg:items-center lg:gap-12">
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-4xl">
            Type a little.
            <br />
            Tap the rest.
            <br />
            Speak.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-zinc-700">
            Suggestions help finish your thought. Choose your words, then press Speak to say them
            out loud.
          </p>
          <p className="mt-6 text-base font-medium leading-relaxed text-indigo-700">
            Try typing “I ha”, then tap a suggestion.
          </p>
        </div>

        <WorkingDemo />
      </div>
    </section>
  );
}

function WorkingDemo() {
  const [text, setText] = useState('');
  const { speak: speakAloud } = useDemoSpeech();
  const [spoken, setSpoken] = useState(DEMO_TRANSCRIPT);
  const [pinned, setPinned] = useState<string[]>(DEMO_PINNED);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Undo stack mirrors the real composer: capture each text change so undo can
  // step back through typed + suggestion-driven edits.
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const prevTextRef = useRef(text);
  const isUndoingRef = useRef(false);

  useEffect(() => {
    if (isUndoingRef.current) {
      isUndoingRef.current = false;
      prevTextRef.current = text;
      return;
    }
    if (text !== prevTextRef.current) {
      setUndoStack(s => [...s.slice(-49), prevTextRef.current]);
      prevTextRef.current = text;
    }
  }, [text]);

  // Auto-grow the composer textarea to fit its content (matches the real editor).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  // Like the app, keep the rows that start with or contain the typed words.
  // The already-typed prefix is hidden, and the words found inside a row are
  // marked.
  const stripes = useMemo<LandingStripe[]>(
    () =>
      DEMO_SUGGESTIONS.filter(s => !text.trim() || matchTyped(s.text, text) !== null).map(s => ({
        ...stripeForText(s.text, text),
        source: s.source,
      })),
    [text]
  );

  const speak = useCallback(
    (value = text) => {
      const message = value.trim();
      if (!message) return;
      setSpoken(current => [...current.slice(-5), message]);
      speakAloud(message);
      setText('');
      inputRef.current?.focus();
    },
    [setText, speakAloud, text]
  );

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    isUndoingRef.current = true;
    setText(prev);
    setUndoStack(s => s.slice(0, -1));
    inputRef.current?.focus();
  }, [undoStack, setText]);

  const deleteLastWord = useCallback(() => {
    const trimmed = text.replace(/\s+$/, '');
    const idx = trimmed.search(/\S+$/);
    setText(idx > 0 ? trimmed.slice(0, idx) : '');
    inputRef.current?.focus();
  }, [text, setText]);

  const clearText = useCallback(() => {
    setText('');
    inputRef.current?.focus();
  }, [setText]);

  const handlePin = useCallback((phrase: string) => {
    setPinned(current => (current.includes(phrase) ? current : [...current, phrase]));
  }, []);

  return (
    <div className="min-w-0">
      <div
        data-live-demo-frame
        className="grid min-h-[560px] overflow-hidden rounded-surface border border-zinc-300 bg-white shadow-sm"
      >
        <div className="grid min-w-0 grid-rows-[52px_minmax(0,1fr)] lg:grid-rows-[60px_minmax(0,1fr)]">
          {/* Header — sidebar trigger + space title + panel toggle */}
          <header className="flex items-center gap-2 border-b px-3 lg:px-4">
            <span className="grid size-9 place-items-center rounded-md text-muted-foreground">
              <PanelLeft className="size-4" aria-hidden="true" />
            </span>
            <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
            <strong className="min-w-0 truncate text-sm font-medium text-zinc-950 sm:text-base">
              {LANDING_SPACE_SEED.title}
            </strong>
            <span className="ml-auto grid size-9 place-items-center rounded-md text-muted-foreground">
              <PanelRight className="size-4" aria-hidden="true" />
            </span>
          </header>

          {/* Compose column — transcript above, console (suggestions + composer) below */}
          <div className="flex min-w-0 flex-col gap-4 overflow-hidden px-3 pb-3 sm:px-4 sm:pb-4">
            {/* Transcript — spoken messages anchored to the bottom */}
            <div className="flex min-h-36 flex-1 flex-col justify-end gap-2.5 overflow-y-auto py-4 sm:min-h-0">
              {spoken.map((message, i) => (
                <div
                  key={`${message}-${i}`}
                  className="flex animate-in fade-in slide-in-from-bottom-1 justify-end motion-reduce:animate-none"
                >
                  <div className="flex max-w-[85%] items-start gap-2 rounded-lg rounded-br-sm bg-indigo-600 px-4 py-3 text-left text-white">
                    <Volume2 className="mt-1 size-4 shrink-0 opacity-60" aria-hidden="true" />
                    <p className="text-xl leading-snug">{message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Console — suggestions + composer + space tabs on a calm surface */}
            <div className="flex shrink-0 flex-col gap-3 rounded-lg bg-muted/40 p-3">
              {/* Right-edge fade signals the stripe rows scroll on narrow screens. */}
              <div className="[mask-image:linear-gradient(to_right,black_92%,transparent)] sm:[mask-image:none]">
                <LandingSuggestionStripes
                  stripes={stripes}
                  pinnedChips={pinned}
                  onPin={handlePin}
                  onSubmit={speak}
                  onTake={setText}
                />
              </div>

              <div className="rounded-2xl border-2 border-input bg-background p-3 transition-colors focus-within:border-ring">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={text}
                  onChange={event => setText(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      speak();
                    }
                  }}
                  aria-label="Try September Talk"
                  placeholder="Type a message…"
                  className="max-h-40 w-full resize-none overflow-y-auto bg-transparent text-2xl font-medium leading-snug text-foreground placeholder:text-zinc-500 focus:outline-none"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <RailButton label="Undo" onClick={undo} disabled={undoStack.length === 0}>
                      <Undo2 className="size-5" />
                    </RailButton>
                    <RailButton label="Delete last word" onClick={deleteLastWord} disabled={!text}>
                      <Delete className="size-5" />
                    </RailButton>
                    <RailButton label="Clear" onClick={clearText} disabled={!text}>
                      <Trash2 className="size-5" />
                    </RailButton>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Static sound output key. The live selector needs the
                      output devices, so here it only mirrors the look. */}
                    <span
                      title="System Default"
                      className="hidden size-11 place-items-center rounded-md border bg-card text-muted-foreground sm:grid"
                    >
                      <Headphones className="size-5" aria-hidden="true" />
                    </span>
                    <button
                      type="button"
                      onClick={() => speak()}
                      disabled={!text.trim()}
                      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[opacity,transform] hover:enabled:scale-[1.02] active:enabled:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                    >
                      <Volume2 className="size-4" aria-hidden="true" />
                      Speak
                    </button>
                  </div>
                </div>
              </div>

              {/* Space tabs — mirrors SpaceSwitch styling */}
              <div className="flex items-center gap-1 overflow-hidden rounded-md border bg-card p-0.5">
                <button
                  type="button"
                  aria-pressed="true"
                  className="h-8 shrink-0 whitespace-nowrap rounded bg-primary px-3 text-sm font-medium text-primary-foreground"
                >
                  {LANDING_SPACE_SEED.title}
                </button>
                <button
                  type="button"
                  className="flex h-8 shrink-0 items-center gap-1 rounded px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  New
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingSuggestionStripes({
  stripes,
  pinnedChips,
  onPin,
  onSubmit,
  onTake,
}: {
  stripes: LandingStripe[];
  pinnedChips: string[];
  onPin?: (phrase: string) => void;
  onSubmit: (text: string) => void;
  onTake: (text: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {pinnedChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pinnedChips.map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => onTake(`${chip} `)}
              className="flex min-h-12 items-center gap-2 rounded-chip border border-zinc-300 bg-card px-4 py-2 text-left text-lg font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Pin className="size-3.5 text-primary/60" aria-hidden="true" />
              {chip}
            </button>
          ))}
        </div>
      )}
      {stripes.length > 0 && (
        <section aria-label="Suggestions" className="flex flex-col gap-1">
          <h2 className="px-1.5 text-xs font-semibold text-muted-foreground">Suggestions</h2>
          <div className="flex flex-col gap-1.5">
            {stripes.map(stripe => (
              <div
                key={`${stripe.source}:${stripe.text}`}
                data-source={stripe.source}
                className="flex flex-nowrap items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <SourceMark source={stripe.source} code={stripe.code} />
                {stripe.tokens.map((token, index) => {
                  if (index < stripe.hidden) return null;
                  // The typed words inside the row, so the reader sees why it is here.
                  const found =
                    stripe.found !== undefined &&
                    index >= stripe.found[0] &&
                    index < stripe.found[1];
                  return (
                    <button
                      key={`${token}:${index}`}
                      type="button"
                      onClick={() => onTake(joinTokens(stripe.tokens.slice(0, index + 1)))}
                      className={cn(
                        'min-h-11 shrink-0 rounded-chip border px-4 text-base font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        LANE[stripe.source],
                        found && 'underline decoration-primary decoration-2 underline-offset-4'
                      )}
                    >
                      {token}
                    </button>
                  );
                })}
                {onPin && (
                  <button
                    type="button"
                    aria-label={`Keep ${stripe.text}`}
                    onClick={() => onPin(stripe.text)}
                    className="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                  >
                    <Pin className="size-4" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Speak ${stripe.text}`}
                  onClick={() => onSubmit(stripe.text)}
                  className="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                >
                  <Volume2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// The tile colors of each source, as in the app.
const LANE: Record<SuggestionSource, string> = {
  md: 'border-primary/40 bg-card hover:border-primary/70 hover:bg-primary/5',
  history: 'border-chart-2/45 bg-card hover:border-chart-2/70 hover:bg-chart-2/5',
  llm: 'border-border bg-card hover:border-primary/50 hover:bg-primary/5',
  code: 'border-primary/70 bg-primary/10 hover:border-primary hover:bg-primary/15',
  starter: 'border-primary/40 bg-card hover:border-primary/70 hover:bg-primary/5',
};

// The mark at the start of a row says where the row came from.
function SourceMark({ source, code }: { source: SuggestionSource; code?: string }) {
  if (source === 'code') {
    return (
      <span
        aria-label={`Code ${code}`}
        className="inline-flex shrink-0 items-center rounded-md bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground"
      >
        {code}
      </span>
    );
  }
  if (source === 'starter') {
    return <ChevronsRight className="size-4 shrink-0 text-primary" aria-label="An opening" />;
  }
  if (source === 'history') {
    return <History className="size-4 shrink-0 text-chart-2" aria-label="You said this before" />;
  }
  if (source === 'md') {
    return <Pin className="size-4 shrink-0 text-primary/70" aria-label="A saved phrase" />;
  }
  return (
    <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-label="From AI Assistance" />
  );
}

// Left-rail icon button — undo / delete-word / clear (matches the real composer rail).
function RailButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}
