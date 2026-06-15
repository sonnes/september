'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { layoutWithLines, prepareWithSegments } from '@chenglou/pretext';

import { Stripe } from './use-stripes';

// Base tile metrics — must mirror the chip styles in SuggestionStripes so the
// fit math matches what actually renders. Padding values are per-side.
export const STRIPE_BASE = {
  fontPx: 18, // text-lg
  gapPx: 6, // gap-1.5
  wordPadXPx: 16, // px-4
  punctPadXPx: 10, // px-2.5
  minHeightPx: 48, // min-h-12
};

const FONT_WEIGHT = '500'; // font-medium
const FONT_FAMILY = '"Noto Sans"';
const SOURCE_MARK_PX = 16; // size-4 leading marker — fixed, not scaled
const MIN_SCALE = 0.5;
const PUNCTUATION = /^[.,!?;:]+$/;

/** Natural single-line width of a token, measured with Pretext. */
function naturalWidth(text: string, font: string): number {
  if (!text) return 0;
  const prepared = prepareWithSegments(text, font);
  return layoutWithLines(prepared, 1e6, 100).lines[0]?.width ?? 0;
}

export interface UseStripeScaleResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
}

/**
 * One uniform scale for every stripe so the *longest* suggestion fits on a
 * single line within the container. Token widths are measured with Pretext (the
 * same engine the display reel uses); the row width — text + pill padding +
 * gaps — is then fit to the measured container width.
 */
export function useStripeScale(stripes: Stripe[]): UseStripeScaleResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [fontReady, setFontReady] = useState(() => {
    if (typeof document === 'undefined') return false;
    try {
      return document.fonts.check(`16px ${FONT_FAMILY}`);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (fontReady || typeof document === 'undefined') return;
    document.fonts.ready.then(() => setFontReady(true));
  }, [fontReady]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Recompute only when the visible token content changes.
  const signature = useMemo(
    () => stripes.map(s => s.tokens.slice(s.hidden).join('')).join(''),
    [stripes]
  );

  const scale = useMemo(() => {
    if (!fontReady || width <= 0) return 1;
    const font = `${FONT_WEIGHT} ${STRIPE_BASE.fontPx}px ${FONT_FAMILY}`;

    let maxScalable = 0;
    for (const stripe of stripes) {
      const tokens = stripe.tokens.slice(stripe.hidden);
      if (tokens.length === 0) continue;
      // every gap (mark→t1 … t(n-1)→tn) scales with the tiles
      let scalable = tokens.length * STRIPE_BASE.gapPx;
      for (const token of tokens) {
        const padX = PUNCTUATION.test(token) ? STRIPE_BASE.punctPadXPx : STRIPE_BASE.wordPadXPx;
        scalable += naturalWidth(token, font) + padX * 2;
      }
      // trailing submit (enter) button — an icon tile + its leading gap
      scalable += STRIPE_BASE.gapPx + STRIPE_BASE.fontPx + STRIPE_BASE.wordPadXPx * 2;
      if (scalable > maxScalable) maxScalable = scalable;
    }

    if (maxScalable <= 0) return 1;
    const available = width - SOURCE_MARK_PX; // leading marker is not scaled
    return Math.max(MIN_SCALE, Math.min(1, available / maxScalable));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontReady, width, signature]);

  return { containerRef, scale };
}
