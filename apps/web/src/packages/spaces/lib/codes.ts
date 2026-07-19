/**
 * Pure helpers for phrase codes — short abbreviations that surface a saved
 * phrase in the suggestion stripe while typing (`ty` → "Thank you").
 *
 * Codes are stored lowercase and matched case-insensitively against the word
 * at the caret. A user-set code pins its row; AI-seeded codes are assigned
 * deterministically here (never by the LLM) and are replaced with their rows
 * on regeneration.
 */

import type { SavedPhrase } from '../types';

export const CODE_MIN_LENGTH = 2;
export const CODE_MAX_LENGTH = 5;

/** Generated codes cap at 4 chars so one mutation char still fits the max. */
const GENERATED_MAX_INITIALS = 4;

const CODE_FORMAT = /^[a-z0-9]{2,5}$/;

/**
 * Function words skipped when deriving a code from a phrase's initials.
 * Deliberately keeps "I" and "you" — they carry meaning in AAC phrases
 * ("Thank you" → ty, "I want to go to the bathroom" → iwgb).
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'and', 'or', 'but', 'for', 'at', 'in', 'on',
  'with', 'is', 'are', 'was', 'were', 'be', 'been', 'am',
]);

/**
 * Common short English words (2–5 letters — the only lengths a code can take).
 * The default `isWord` check so codes never collide with words the user would
 * type literally. Callers may inject a richer dictionary instead.
 */
const COMMON_WORDS = new Set([
  // 2 letters
  'am', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'hi', 'if', 'in',
  'is', 'it', 'me', 'my', 'no', 'of', 'ok', 'on', 'or', 'so', 'to', 'up',
  'us', 'we',
  // 3 letters
  'all', 'and', 'any', 'are', 'ask', 'bad', 'big', 'boy', 'but', 'buy',
  'can', 'car', 'cat', 'day', 'did', 'dog', 'eat', 'end', 'far', 'few',
  'for', 'fun', 'get', 'got', 'had', 'has', 'her', 'him', 'his', 'hot',
  'how', 'its', 'let', 'lot', 'man', 'may', 'men', 'mom', 'dad', 'new',
  'not', 'now', 'off', 'old', 'one', 'our', 'out', 'own', 'put', 'ran',
  'run', 'sad', 'saw', 'say', 'see', 'she', 'sit', 'six', 'ten', 'the',
  'too', 'try', 'two', 'use', 'was', 'way', 'who', 'why', 'yes', 'yet',
  'you',
  // 4 letters
  'able', 'also', 'back', 'been', 'best', 'both', 'call', 'came', 'come',
  'cold', 'does', 'done', 'down', 'each', 'even', 'feel', 'find', 'fine',
  'from', 'give', 'good', 'have', 'head', 'help', 'here', 'home', 'hurt',
  'into', 'just', 'keep', 'know', 'last', 'left', 'like', 'long', 'look',
  'love', 'made', 'make', 'many', 'more', 'most', 'much', 'must', 'name',
  'need', 'next', 'nice', 'once', 'only', 'open', 'over', 'pain', 'rest',
  'said', 'same', 'some', 'soon', 'stop', 'such', 'sure', 'take', 'talk',
  'tell', 'than', 'that', 'them', 'then', 'they', 'this', 'time', 'turn',
  'used', 'very', 'want', 'warm', 'well', 'went', 'were', 'what', 'when',
  'will', 'with', 'work', 'your',
  // 5 letters
  'about', 'after', 'again', 'catch', 'could', 'every', 'first', 'found',
  'going', 'great', 'happy', 'house', 'later', 'least', 'maybe', 'might',
  'never', 'often', 'other', 'place', 'right', 'shall', 'sleep', 'small',
  'sorry', 'still', 'thank', 'there', 'these', 'thing', 'think', 'those',
  'three', 'tired', 'today', 'under', 'water', 'where', 'which', 'while',
  'would', 'write',
]);

/** Whether `word` is a common English word a user might type literally. */
export function isCommonWord(word: string): boolean {
  return COMMON_WORDS.has(word.trim().toLowerCase());
}

/** Canonical stored form of a code: trimmed, lowercase. */
export function normalizeCode(raw: string): string {
  return raw.trim().toLowerCase();
}

export type CodeValidation =
  | { ok: true; code: string }
  | { ok: false; reason: 'format' | 'dictionary' | 'duplicate'; suggestion?: string };

export interface CodeCheckOptions {
  /** All codes already in use (any space, any kind). */
  existingCodes: string[];
  /** Dictionary check — defaults to the built-in common-word list. */
  isWord?: (word: string) => boolean;
}

/**
 * Validate a user-entered code. Returns the normalized code on success; on
 * dictionary/duplicate collision, offers a mutated suggestion when one exists.
 */
export function validateCode(raw: string, options: CodeCheckOptions): CodeValidation {
  const { existingCodes, isWord = isCommonWord } = options;
  const code = normalizeCode(raw);
  if (!CODE_FORMAT.test(code)) return { ok: false, reason: 'format' };

  const taken = new Set(existingCodes.map(normalizeCode));
  const reject = (reason: 'dictionary' | 'duplicate'): CodeValidation => ({
    ok: false,
    reason,
    suggestion: mutateCode(code, taken, isWord),
  });

  if (isWord(code)) return reject('dictionary');
  if (taken.has(code)) return reject('duplicate');
  return { ok: true, code };
}

/**
 * Derive a code from a phrase deterministically: initials of its content words
 * (stopwords dropped), capped at 4, mutated on dictionary/duplicate collision.
 * Returns undefined when the phrase has fewer than two content words or no
 * collision-free mutation exists.
 */
export function generateCode(phrase: string, options: CodeCheckOptions): string | undefined {
  const { existingCodes, isWord = isCommonWord } = options;
  const words = phrase
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w && !STOPWORDS.has(w));
  if (words.length < 2) return undefined;

  const candidate = words
    .slice(0, GENERATED_MAX_INITIALS)
    .map(w => w[0])
    .join('');
  const taken = new Set(existingCodes.map(normalizeCode));

  if (!isWord(candidate) && !taken.has(candidate)) return candidate;
  return mutateCode(candidate, taken, isWord);
}

/**
 * Nudge a colliding code into a free one: try appended digits/letters within
 * the length cap, then a truncated variant. Deterministic; undefined when
 * nothing frees up.
 */
function mutateCode(
  code: string,
  taken: Set<string>,
  isWord: (word: string) => boolean
): string | undefined {
  const base = code.length < CODE_MAX_LENGTH ? code : code.slice(0, CODE_MAX_LENGTH - 1);
  for (const suffix of ['x', 'z', 'q', '2', '3', '4', '5', '6', '7', '8', '9']) {
    const candidate = base + suffix;
    if (CODE_FORMAT.test(candidate) && !isWord(candidate) && !taken.has(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * The whitespace-delimited word at the caret (composer text end). Empty when
 * the text ends in whitespace — a completed word is never a live trigger.
 */
export function trailingWord(text: string): string {
  const match = text.match(/(\S+)$/);
  return match ? match[1] : '';
}

/**
 * The saved phrase whose code exactly matches `word` (case-insensitive).
 * Current-space rows win conflicts; within a space, pinned rows win.
 */
export function matchCode(
  word: string,
  rows: SavedPhrase[],
  currentSpaceId?: string
): SavedPhrase | undefined {
  const code = normalizeCode(word);
  if (!code) return undefined;

  const matches = rows.filter(r => r.code && normalizeCode(r.code) === code);
  if (matches.length === 0) return undefined;

  const rank = (r: SavedPhrase) =>
    (r.space_id === currentSpaceId ? 0 : 2) + (r.pinned ? 0 : 1);
  return [...matches].sort((a, b) => rank(a) - rank(b))[0];
}
