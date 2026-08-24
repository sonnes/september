import { useCallback, useMemo, useRef, useState } from 'react';

import { Volume2 } from 'lucide-react';

import { matchCode, trailingWord, type SavedPhrase } from '@/rules/phrases';
import { codeExpansionText, stripeForText } from '@/rules/stripes';

import { LandingSuggestionStripes, type LandingStripe } from './live-demo-section';
import { SectionHeader } from './section-header';
import { useDemoSpeech } from './use-demo-speech';

const DEMO_SPACE_ID = 'landing-demo-space';

// Marketing-only example rows — everyday, dignified phrases. The matching and
// take machinery is the real feature; only these rows are demo-local.
const DEMO_PHRASES: { text: string; code?: string }[] = [
  { text: 'Hello' },
  { text: 'Thank you', code: 'ty' },
  { text: 'I need some help please', code: 'hlp' },
  { text: 'Water, please', code: 'wtr' },
  { text: 'Good morning' },
];

const DEMO_ROWS: SavedPhrase[] = DEMO_PHRASES.map((phrase, index) => ({
  id: `landing-demo-${index}`,
  space_id: DEMO_SPACE_ID,
  text: phrase.text,
  kind: 'phrase',
  pinned: true,
  code: phrase.code,
  created_at: 0,
  updated_at: 0,
}));

const CODED_ROWS = DEMO_ROWS.filter(row => row.code);

export interface DemoCodeMatch {
  code: string;
  phrase: string;
}

/** The seed phrase whose code matches the word at the caret — real matchCode. */
export function matchDemoCode(text: string): DemoCodeMatch | undefined {
  const word = trailingWord(text);
  if (!word) return undefined;
  const row = matchCode(word, DEMO_ROWS, DEMO_SPACE_ID);
  return row?.code ? { code: row.code, phrase: row.text } : undefined;
}

export function PhraseCodesSection() {
  return (
    <section className="bg-zinc-100 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)] lg:items-center">
        <SectionHeader
          eyebrow="Saved phrases & codes"
          title="Your everyday sentences, two letters away."
          lede="Save the sentences you say all the time and give them short codes. Type ty and “Thank you” surfaces instantly — one tap swaps it in. Pinned phrases stay ready before you type anything."
          hint="Type ty, hlp, or wtr — then tap the phrase."
          accent="amber"
        />
        <CodesDemo />
      </div>
    </section>
  );
}

function CodesDemo() {
  const [text, setText] = useState('');
  const { speak } = useDemoSpeech();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [spoken, setSpoken] = useState<string[]>([]);

  const speakMessage = useCallback(
    (value: string) => {
      const message = value.trim();
      if (!message) return;
      setSpoken(current => [...current.slice(-1), message]);
      speak(message);
      setText('');
      inputRef.current?.focus();
    },
    [speak, setText]
  );

  // Same construction as useStripes' code path: the stripe's text is the
  // composer text with the trailing code replaced, so the existing take
  // machinery consumes the typed trigger.
  const stripes = useMemo<LandingStripe[]>(() => {
    const word = trailingWord(text);
    if (!word) return [];
    const row = matchCode(word, DEMO_ROWS, DEMO_SPACE_ID);
    if (!row) return [];
    const expanded = codeExpansionText(text, row.text);
    if (expanded.trim().toLowerCase() === text.trim().toLowerCase()) return [];
    return [{ ...stripeForText(expanded, text), source: 'code', code: row.code }];
  }, [text]);

  const pinnedChips = useMemo(() => DEMO_ROWS.map(row => row.text), []);

  return (
    <div className="overflow-hidden rounded-2xl bg-amber-50 p-4 shadow-sm ring-1 ring-amber-100">
      <div className="flex min-h-64 flex-col justify-end gap-3 rounded-lg bg-white/70 p-3">
        {spoken.length > 0 && (
          <div className="flex flex-col items-end gap-2">
            {spoken.map((message, index) => (
              <div
                key={`${message}-${index}`}
                className="flex max-w-[85%] animate-in fade-in slide-in-from-bottom-1 items-start gap-2 rounded-lg rounded-br-sm bg-accent px-4 py-2.5 text-accent-foreground motion-reduce:animate-none"
              >
                <Volume2 className="mt-1 size-4 shrink-0 opacity-60" aria-hidden="true" />
                <p className="text-base leading-snug">{message}</p>
              </div>
            ))}
          </div>
        )}
        <LandingSuggestionStripes
          stripes={stripes}
          pinnedChips={pinnedChips}
          onSubmit={speakMessage}
          onTake={setText}
        />
        <div className="rounded-2xl border-2 border-input bg-background p-3 transition-colors focus-within:border-ring">
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={event => setText(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                speakMessage(text);
              }
            }}
            placeholder="Try: I made it, ty"
            aria-label="Message with phrase codes"
            className="max-h-40 w-full resize-none overflow-y-auto bg-transparent text-2xl font-medium leading-snug text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => speakMessage(text)}
              disabled={!text.trim()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[opacity,transform] hover:enabled:scale-[1.02] active:enabled:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <Volume2 className="size-4" aria-hidden="true" />
              Speak
            </button>
          </div>
        </div>
        <p className="px-1 text-sm text-zinc-600">
          Codes here:{' '}
          {CODED_ROWS.map((row, index) => (
            <span key={row.code}>
              {index > 0 && ' · '}
              <strong>{row.code}</strong> → {row.text}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
