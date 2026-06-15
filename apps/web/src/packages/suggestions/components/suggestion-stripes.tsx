'use client';

import { useRef, useState } from 'react';

import { History, Pin } from 'lucide-react';

import { cn } from '@/packages/shared';
import { useEditorContext } from '@/packages/editor';

import { appendTokens, joinTokens } from '../lib/stripes';
import { Stripe } from '../hooks/use-stripes';

// CRITICAL INVARIANT: partial-take and chip-insert must NOT call trackKeystroke.
// The "keystrokes saved" analytic is text_length − keys_typed; calling
// trackKeystroke here would erase the keystroke savings gained by using suggestions.

const PUNCTUATION = /^[.,!?;:]+$/;

type HoverState = { stripe: number; index: number } | null;

// Per-source colour lanes for the stripe tiles. Source is ALSO shown by icon
// (SourceMark), so colour reinforces provenance — it is never the only channel.
const SOURCE_LANE: Record<NonNullable<Stripe['source']>, { idle: string; active: string }> = {
  // Context (pinned from the space md) — indigo / brand.
  md: {
    idle: 'border-primary/40 bg-card text-foreground hover:border-primary/70 hover:bg-primary/5',
    active: 'border-primary bg-primary/10 text-primary',
  },
  // Things you've said before — teal.
  history: {
    idle: 'border-chart-2/45 bg-card text-foreground hover:border-chart-2/70 hover:bg-chart-2/5',
    active: 'border-chart-2 bg-chart-2/10 text-chart-2',
  },
  // AI-generated — the calm, unmarked neutral baseline.
  llm: {
    idle: 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5',
    active: 'border-primary bg-primary/10 text-primary',
  },
};

interface SuggestionStripesProps {
  stripes: Stripe[];
  pinnedChips: string[];
  className?: string;
  /** Optional: called when the user pins a phrase to the space context. */
  onPin?: (phrase: string) => void;
}

export function SuggestionStripes({
  stripes,
  pinnedChips,
  className,
  onPin,
}: SuggestionStripesProps) {
  const { text, setText } = useEditorContext();
  const [past, setPast] = useState<string[]>([]);
  const [hover, setHover] = useState<HoverState>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Apply a new text value, saving the current value to the undo stack. */
  const apply = (next: string) => {
    setPast(p => [...p, text]);
    // CRITICAL: Do NOT call trackKeystroke — see module invariant above.
    setText(next);
    setHover(null);
  };

  /** Partial-take: select up to token `tokenIndex` of stripe `stripeIndex`. */
  const selectUpTo = (stripeIndex: number, tokenIndex: number) => {
    apply(joinTokens(stripes[stripeIndex].tokens.slice(0, tokenIndex + 1)));
  };

  /** Chip/word insert: append the chip text to the current editor text. */
  const insertChip = (word: string) => {
    apply(appendTokens(text, word));
  };

  if (stripes.length === 0 && pinnedChips.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)} ref={containerRef}>
      {/* Pinned word chips from the space md */}
      {pinnedChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pinnedChips.map((chip, ci) => (
            <button
              key={chip}
              type="button"
              onClick={() => insertChip(chip)}
              style={{ animationDelay: `${ci * 30}ms`, animationFillMode: 'both' }}
              className={cn(
                'flex h-11 animate-in fade-in slide-in-from-bottom-1 items-center gap-1.5 rounded-full border px-5 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:animate-none',
                'border-primary/30 bg-card text-foreground hover:border-primary/60 hover:bg-primary/5'
              )}
            >
              <Pin className="size-3.5 text-primary/60" aria-hidden />
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Sentence stripes: tap a word to take the sentence up to that point. The
          already-typed prefix is shown as ghost text so the whole sentence reads. */}
      <div className="flex flex-col gap-2">
        {stripes.map((stripe, si) => {
          const lane = SOURCE_LANE[stripe.source ?? 'llm'];
          return (
            <div
              key={stripe.text}
              className="flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
              style={{ animationDelay: `${si * 45}ms`, animationFillMode: 'both' }}
              onMouseLeave={() => setHover(null)}
            >
              <SourceMark source={stripe.source} onPin={onPin ? () => onPin(stripe.text) : undefined} />

              {/* Selectable token tiles. The already-typed prefix (stripe.hidden
                  tokens) is omitted — we don't repeat what's already entered. */}
              {stripe.tokens.map((token, ti) => {
                if (ti < stripe.hidden) return null;
                const active = hover !== null && hover.stripe === si && ti <= hover.index;
                const isPunct = PUNCTUATION.test(token);
                return (
                  <button
                    key={ti}
                    type="button"
                    onMouseEnter={() => setHover({ stripe: si, index: ti })}
                    onFocus={() => setHover({ stripe: si, index: ti })}
                    onClick={() => selectUpTo(si, ti)}
                    className={cn(
                      'min-h-12 rounded-lg border text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isPunct ? 'px-2.5' : 'px-4 font-medium',
                      active ? lane.active : lane.idle
                    )}
                  >
                    {token}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Leading provenance marker — icon paired with the tile's colour lane. */
function SourceMark({
  source,
  onPin,
}: {
  source: Stripe['source'];
  onPin?: () => void;
}) {
  if (source === 'md') {
    return (
      <button
        type="button"
        onClick={onPin}
        title={onPin ? 'Pin to space context' : undefined}
        className={cn(
          'size-4 shrink-0 text-primary/60',
          onPin && 'cursor-pointer hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded'
        )}
        aria-label="From context"
      >
        <Pin className="size-4" aria-hidden />
      </button>
    );
  }
  if (source === 'history') {
    return <History className="size-4 shrink-0 text-muted-foreground" aria-label="You said this before" />;
  }
  // LLM suggestions carry no marker — the unmarked baseline.
  return <span className="w-4 shrink-0" aria-hidden />;
}
