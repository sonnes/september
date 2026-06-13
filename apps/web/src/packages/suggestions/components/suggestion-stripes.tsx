'use client';

import { useEffect, useRef, useState } from 'react';

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

// ---------------------------------------------------------------------------
// Scan-mode types
// ---------------------------------------------------------------------------

/**
 * A flat list of all scannable targets in the stripes surface.
 * Each target knows how to activate itself.
 */
type ScanTarget =
  | { kind: 'chip'; chipIndex: number }
  | { kind: 'token'; stripeIndex: number; tokenIndex: number };

interface SuggestionStripesProps {
  stripes: Stripe[];
  pinnedChips: string[];
  /** When true, a sequential highlight cycles over chips then stripe tokens. */
  scanMode?: boolean;
  className?: string;
  /** Optional: called when the user pins a phrase to the space context. */
  onPin?: (phrase: string) => void;
}

export function SuggestionStripes({
  stripes,
  pinnedChips,
  scanMode = false,
  className,
  onPin,
}: SuggestionStripesProps) {
  const { text, setText } = useEditorContext();
  const [past, setPast] = useState<string[]>([]);
  const [hover, setHover] = useState<HoverState>(null);
  // Scan-mode: index into the flat target list. -1 = nothing highlighted.
  const [scanIdx, setScanIdx] = useState(-1);
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

  // ---------------------------------------------------------------------------
  // Scan-mode: build flat target list and handle keyboard step/activate
  // ---------------------------------------------------------------------------

  const targets = buildTargets(stripes, pinnedChips);

  // Reset scan index whenever mode turns off or content changes shape.
  useEffect(() => {
    if (!scanMode) setScanIdx(-1);
  }, [scanMode]);

  useEffect(() => {
    if (!scanMode) return;
    // Wrap around when content changes.
    if (targets.length === 0) {
      setScanIdx(-1);
      return;
    }
    setScanIdx(idx => (idx >= targets.length ? 0 : idx));
  }, [scanMode, targets.length]);

  useEffect(() => {
    if (!scanMode) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        // Step forward on space, activate on Enter.
        if (e.key === ' ') {
          e.preventDefault();
          setScanIdx(idx => (targets.length === 0 ? -1 : (idx + 1) % targets.length));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          activateScanTarget(scanIdx);
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [scanMode, scanIdx, targets]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Activate the scan target at `idx`. */
  const activateScanTarget = (idx: number) => {
    if (idx < 0 || idx >= targets.length) return;
    const target = targets[idx];
    if (target.kind === 'chip') {
      insertChip(pinnedChips[target.chipIndex]);
    } else {
      selectUpTo(target.stripeIndex, target.tokenIndex);
    }
    // Advance to next after activation.
    setScanIdx(i => (targets.length === 0 ? -1 : (i + 1) % targets.length));
  };

  /** Whether a particular token tile has the scan highlight. */
  const isScanHighlighted = (target: ScanTarget): boolean => {
    if (!scanMode || scanIdx < 0 || scanIdx >= targets.length) return false;
    const cur = targets[scanIdx];
    if (cur.kind !== target.kind) return false;
    if (cur.kind === 'chip' && target.kind === 'chip') return cur.chipIndex === target.chipIndex;
    if (cur.kind === 'token' && target.kind === 'token') {
      return cur.stripeIndex === target.stripeIndex && cur.tokenIndex === target.tokenIndex;
    }
    return false;
  };

  if (stripes.length === 0 && pinnedChips.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)} ref={containerRef}>
      {/* Pinned word chips from the space md */}
      {pinnedChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pinnedChips.map((chip, ci) => {
            const chipTarget: ScanTarget = { kind: 'chip', chipIndex: ci };
            const isHighlighted = isScanHighlighted(chipTarget);
            return (
              <button
                key={chip}
                type="button"
                onClick={() => insertChip(chip)}
                style={{ animationDelay: `${ci * 30}ms`, animationFillMode: 'both' }}
                className={cn(
                  'flex h-11 animate-in fade-in slide-in-from-bottom-1 items-center gap-1.5 rounded-full border px-5 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:animate-none',
                  isHighlighted
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-primary/30 bg-card text-foreground hover:border-primary/60 hover:bg-primary/5'
                )}
              >
                <Pin className="size-3.5 text-primary/60" aria-hidden />
                {chip}
              </button>
            );
          })}
        </div>
      )}

      {/* Sentence stripes: tap a word to take the sentence up to that point. The
          already-typed prefix is shown as ghost text so the whole sentence reads. */}
      <div className="flex flex-col gap-2">
        {stripes.map((stripe, si) => {
          const prefix = stripe.hidden > 0 ? joinTokens(stripe.tokens.slice(0, stripe.hidden)).trim() : '';
          return (
            <div
              key={stripe.text}
              className="flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
              style={{ animationDelay: `${si * 45}ms`, animationFillMode: 'both' }}
              onMouseLeave={() => setHover(null)}
            >
              <SourceMark source={stripe.source} onPin={onPin ? () => onPin(stripe.text) : undefined} />

              {/* Ghost prefix — the part already typed, included on any take */}
              {prefix && (
                <span className="select-none px-0.5 text-lg text-muted-foreground/70" aria-hidden>
                  {prefix}
                </span>
              )}

              {/* Selectable token tiles */}
              {stripe.tokens.map((token, ti) => {
                if (ti < stripe.hidden) return null;
                const mouseActive = hover !== null && hover.stripe === si && ti <= hover.index;
                const tokenTarget: ScanTarget = { kind: 'token', stripeIndex: si, tokenIndex: ti };
                const scanActive = isScanHighlighted(tokenTarget);
                const active = mouseActive || scanActive;
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
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5'
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

/** Build the flat ordered scan-target list: chips first, then tokens left-to-right. */
function buildTargets(stripes: Stripe[], pinnedChips: string[]): ScanTarget[] {
  const targets: ScanTarget[] = [];
  for (let ci = 0; ci < pinnedChips.length; ci++) {
    targets.push({ kind: 'chip', chipIndex: ci });
  }
  for (let si = 0; si < stripes.length; si++) {
    const stripe = stripes[si];
    for (let ti = stripe.hidden; ti < stripe.tokens.length; ti++) {
      targets.push({ kind: 'token', stripeIndex: si, tokenIndex: ti });
    }
  }
  return targets;
}

/** Leading provenance marker — distinguishes by icon (not color alone). */
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
