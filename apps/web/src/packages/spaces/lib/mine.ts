/**
 * Frequency mining for shortcut proposals — all local, no LLM.
 *
 * Scans recent user messages for repeated sentences and repeated 3–8-word
 * phrases inside them, and proposes `phrase + code` pairs the user might want
 * as shortcuts ("you've typed this 9× — keep `tvd`?"). Codes come from the
 * same deterministic generator seeding uses, so collision rules are uniform.
 */

import type { Message, SavedPhrase } from '../types';
import { generateCode, isCommonWord } from './codes';

export interface MinedShortcut {
  /** Surface form of the phrase (most recent occurrence, trailing punctuation stripped). */
  text: string;
  /** Proposed code — collision-free against existing codes at mining time. */
  code: string;
  /** Raw occurrence count (one per message) inside the scanned window. */
  count: number;
}

export interface MineOptions {
  /** All saved phrases (any kind, any provenance) — their texts and codes are excluded. */
  existingPhrases: SavedPhrase[];
  /** Normalized texts the user dismissed — never re-proposed. */
  dismissed: Set<string>;
  /** Dictionary check for code generation; defaults to the built-in list. */
  isWord?: (word: string) => boolean;
  /** Injected clock so mining stays pure/testable. */
  now?: Date;
}

/** Only this many most-recent messages are scanned. */
const WINDOW = 300;
/** A phrase must recur this often (raw, undecayed) to be proposed. */
const MIN_COUNT = 5;
/** Shorter phrases aren't worth a code — a 2-word phrase is already few keys. */
const MIN_WORDS = 3;
/** N-gram window scanned inside messages. */
const NGRAM_MAX_WORDS = 8;
/** Occurrence weight halves every 90 days so stale habits fade. */
const DECAY_HALF_LIFE_DAYS = 90;
/** At most this many proposals, ranked by score. */
const MAX_PROPOSALS = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface Candidate {
  key: string;
  surface: string;
  words: number;
  /** Indices of supporting messages (each message counted once). */
  support: number[];
}

/**
 * Canonical form used for candidate counting and the dismissed-set keys —
 * lowercase, collapsed whitespace, trailing punctuation stripped.
 */
export function normalizeMinedText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,!?;:]+$/, '');
}

const normalize = normalizeMinedText;

function stripTrailingPunctuation(text: string): string {
  return text.trim().replace(/[.,!?;:]+$/, '');
}

/**
 * Mine shortcut proposals from recent user messages. Pure; ranked most
 * valuable first (recency-decayed frequency × keystrokes saved).
 */
export function mineShortcuts(messages: Message[], options: MineOptions): MinedShortcut[] {
  const { existingPhrases, dismissed, isWord = isCommonWord, now = new Date() } = options;

  const scanned = messages.filter(m => m.type === 'user').slice(-WINDOW);

  // Collect candidates: the full message plus every 3–8-word n-gram, counted
  // at most once per message. Surface form tracks the latest occurrence.
  const candidates = new Map<string, Candidate>();
  const add = (key: string, surface: string, words: number, messageIndex: number) => {
    let candidate = candidates.get(key);
    if (!candidate) {
      candidate = { key, surface, words, support: [] };
      candidates.set(key, candidate);
    }
    candidate.surface = surface;
    if (candidate.support[candidate.support.length - 1] !== messageIndex) {
      candidate.support.push(messageIndex);
    }
  };

  scanned.forEach((message, index) => {
    const key = normalize(message.text);
    const originalWords = message.text.trim().split(/\s+/);
    if (!key) return;

    const wordCount = key.split(' ').length;
    if (wordCount >= MIN_WORDS) add(key, stripTrailingPunctuation(message.text), wordCount, index);

    const maxN = Math.min(NGRAM_MAX_WORDS, originalWords.length - 1);
    for (let n = MIN_WORDS; n <= maxN; n++) {
      for (let start = 0; start + n <= originalWords.length; start++) {
        const slice = originalWords.slice(start, start + n).join(' ');
        const sliceKey = normalize(slice);
        if (sliceKey.split(' ').length !== n) continue;
        add(sliceKey, stripTrailingPunctuation(slice), n, index);
      }
    }
  });

  // Threshold, then keep only phrases with independent support: a candidate's
  // occurrences don't count where a longer kept candidate already covers that
  // message ("is here now" inside six kept sentences proposes nothing).
  const frequent = [...candidates.values()]
    .filter(c => c.support.length >= MIN_COUNT)
    .sort((a, b) => b.words - a.words);

  const existingTexts = new Set(existingPhrases.map(p => normalize(p.text)));
  const existingCodes = existingPhrases.filter(p => p.code).map(p => p.code as string);

  const kept: Candidate[] = [];
  const proposals: Array<MinedShortcut & { score: number }> = [];

  for (const candidate of frequent) {
    const covering = kept.filter(k => k.words > candidate.words && k.key.includes(candidate.key));
    const independent = candidate.support.filter(
      m => !covering.some(k => k.support.includes(m))
    );
    if (independent.length < MIN_COUNT) continue;
    kept.push({ ...candidate, support: independent });

    if (existingTexts.has(candidate.key) || dismissed.has(candidate.key)) continue;

    const code = generateCode(candidate.surface, { existingCodes, isWord });
    if (!code) continue;

    const decayed = independent.reduce((sum, m) => {
      const ageDays = Math.max(0, (now.getTime() - scanned[m].created_at.getTime()) / MS_PER_DAY);
      return sum + Math.pow(0.5, ageDays / DECAY_HALF_LIFE_DAYS);
    }, 0);
    const saved = Math.max(1, candidate.surface.length - code.length);

    existingCodes.push(code);
    proposals.push({
      text: candidate.surface,
      code,
      count: independent.length,
      score: decayed * saved,
    });
  }

  return proposals
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PROPOSALS)
    .map(({ text, code, count }) => ({ text, code, count }));
}
