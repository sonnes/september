import type { ReelCaption } from './reel';

/**
 * The single source of truth for the note-reel look, consumed identically by the
 * in-app DOM story player and the canvas MP4 exporter. Every colour here is a
 * stock Tailwind shade so the DOM side can use utility classes and the canvas
 * side its exact hex twin.
 */

export type ReelPairKey = 'stone' | 'emerald' | 'slate' | 'rose' | 'purple' | 'indigo';

export interface ReelPair {
  key: ReelPairKey;
  name: string;
  /** Solid frame background (Tailwind 900/950). */
  bg: string;
  /** Display serif tint (Tailwind 200). */
  display: string;
  /** Support sans tint (Tailwind 50). */
  support: string;
  /** Tailwind class twin for the DOM background. */
  bgClass: string;
}

export const REEL_PAIRS: ReelPair[] = [
  { key: 'stone', name: 'Stone', bg: '#1c1917', display: '#fde68a', support: '#fafaf9', bgClass: 'bg-stone-900' },
  { key: 'emerald', name: 'Emerald', bg: '#022c22', display: '#a7f3d0', support: '#ecfdf5', bgClass: 'bg-emerald-950' },
  { key: 'slate', name: 'Slate', bg: '#0f172a', display: '#bae6fd', support: '#f8fafc', bgClass: 'bg-slate-900' },
  { key: 'rose', name: 'Rose', bg: '#4c0519', display: '#fecdd3', support: '#fff1f2', bgClass: 'bg-rose-950' },
  { key: 'purple', name: 'Purple', bg: '#3b0764', display: '#e9d5ff', support: '#faf5ff', bgClass: 'bg-purple-950' },
  { key: 'indigo', name: 'Indigo', bg: '#1e1b4b', display: '#c7d2fe', support: '#eef2ff', bgClass: 'bg-indigo-950' },
];

export const DEFAULT_PAIR_KEY: ReelPairKey = 'stone';

const PAIR_BY_KEY = new Map(REEL_PAIRS.map(pair => [pair.key, pair]));

export function reelPair(key: ReelPairKey): ReelPair {
  return PAIR_BY_KEY.get(key) ?? PAIR_BY_KEY.get(DEFAULT_PAIR_KEY)!;
}

// ─── Roles ─────────────────────────────────────────────────────

export type CaptionRole = 'display' | 'support';

export interface RoleSpec {
  fontFamily: string;
  fontWeight: number;
  lineHeightRatio: number;
  /** Max font size as a fraction of the frame width. */
  maxFontRatio: number;
  /** Caption box height as a fraction of the frame height. */
  boxHeightRatio: number;
}

export const ROLE_SPECS: Record<CaptionRole, RoleSpec> = {
  display: {
    fontFamily: '"Playfair Display", serif',
    fontWeight: 500,
    lineHeightRatio: 1.08,
    maxFontRatio: 0.4,
    boxHeightRatio: 0.62,
  },
  support: {
    fontFamily: '"Noto Sans", sans-serif',
    fontWeight: 700,
    lineHeightRatio: 1.35,
    maxFontRatio: 0.115,
    boxHeightRatio: 0.5,
  },
};

const ENDS_SENTENCE = /[.!?]$/;

/**
 * Derive a role per caption chunk from punctuation, deterministically, so the
 * DOM player and the canvas exporter compute the identical sequence. A chunk is
 * `display` when it is the first chunk or the previous chunk ended a sentence
 * (`.`, `!`, `?`); otherwise it is a `support` continuation.
 */
export function captionRoles(captions: ReelCaption[]): CaptionRole[] {
  return captions.map((_, index) => {
    if (index === 0) return 'display';
    const prev = captions[index - 1];
    const lastWord = prev.words[prev.words.length - 1]?.text ?? '';
    return ENDS_SENTENCE.test(lastWord) ? 'display' : 'support';
  });
}

/**
 * Base and active word colours for a role on a pair. The active (currently
 * spoken) word swaps the two tones so it pops against the rest of the caption.
 */
export function roleColors(pair: ReelPair, role: CaptionRole): { base: string; active: string } {
  return role === 'display'
    ? { base: pair.display, active: pair.support }
    : { base: pair.support, active: pair.display };
}

// ─── Word states ───────────────────────────────────────────────

export const SPOKEN_OPACITY = 0.55;
export const UNSPOKEN_OPACITY = 0.88;

// ─── Frame chrome (shared by both renderers) ───────────────────

export const GRAIN_OPACITY = 0.06;

/** Film-grain tile used as a CSS background on the DOM side. */
export const REEL_GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E";

/** Soft radial vignette — the DOM CSS gradient and its canvas parameters below. */
export const REEL_VIGNETTE_GRADIENT =
  'radial-gradient(130% 100% at 50% 35%, transparent 58%, rgba(0,0,0,0.32) 100%)';
export const VIGNETTE_CENTER_X_RATIO = 0.5;
export const VIGNETTE_CENTER_Y_RATIO = 0.35;
export const VIGNETTE_RX_RATIO = 1.3;
export const VIGNETTE_RY_RATIO = 1.0;
export const VIGNETTE_INNER_STOP = 0.58;
export const VIGNETTE_OUTER_ALPHA = 0.32;

export const WATERMARK_TEXT = 'September';
export const WATERMARK_LEFT_RATIO = 0.05;
export const WATERMARK_BOTTOM_RATIO = 0.031;
export const WATERMARK_FONT_RATIO = 0.0347;

// ─── Fonts ─────────────────────────────────────────────────────

/**
 * Ensure both reel faces are actually fetched before the first layout. Both the
 * player and the exporter await this: `document.fonts.ready` alone is not
 * enough because an unused face may never have been requested, and canvas
 * `measureText`/`fillText` silently fall back to a default font otherwise.
 */
export async function ensureReelFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('500 32px "Playfair Display"'),
      document.fonts.load('700 32px "Noto Sans"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Font loading is best-effort; fall back to system fonts if it fails.
  }
}
