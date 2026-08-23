/**
 * The rules of a saved phrase, its short code, and the shortcut ideas that
 * come from repeated messages.
 *
 * Ported from `apps/web/src/packages/spaces/lib/{codes,phrases,mine}.ts`. The
 * rules are pure, so a test reads them here without a renderer. Keep them the
 * same in both apps.
 *
 * Core rule: a regeneration rewrites only the rows that are not pinned. A
 * phrase that the user keeps is never moved, and never lost.
 */

import type { Message } from "@/services/data";

export interface SavedPhrase {
  id: string;
  space_id: string;
  text: string;
  kind: PhraseKind;
  code?: string;
  pinned: boolean;
  created_at: number;
  updated_at: number;
}

/**
 * Pure helpers for phrase codes — short abbreviations that surface a saved
 * phrase in the suggestion stripe while typing (`ty` → "Thank you").
 *
 * Codes are stored lowercase and matched case-insensitively against the word
 * at the caret. A user-set code pins its row; AI-seeded codes are assigned
 * deterministically here (never by the LLM) and are replaced with their rows
 * on regeneration.
 */


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

/**
 * Pure helpers for per-space saved phrases.
 *
 * Core invariant: regeneration only ever rewrites AI (`pinned === false`)
 * phrases — pinned phrases are never overwritten, reordered, or dropped.
 */


/** Regenerate AI phrases once this many new messages accrue since the last sync. */
export const PHRASES_STALE_AFTER = 6;

/**
 * The AI texts with any case-insensitive match of a pinned text removed, and
 * with intra-list duplicates dropped (first occurrence kept). Blank texts are
 * skipped. Drives `replaceAiPhrases`.
 */
export function dedupeAgainstPinned(pinnedTexts: string[], aiTexts: string[]): string[] {
  const pinned = new Set(pinnedTexts.map(t => t.trim().toLowerCase()));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const text of aiTexts) {
    const key = text.trim().toLowerCase();
    if (!key || pinned.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export type PhraseKind = "phrase" | "starter";

/** A row's kind. Every desktop row carries one. */
export function rowKind(row: SavedPhrase): PhraseKind {
  return row.kind;
}

/** Rows of one kind, pinned first (order preserved within groups), capped at n. */
export function topRows(rows: SavedPhrase[], n: number, kind: PhraseKind): SavedPhrase[] {
  const ofKind = rows.filter(r => rowKind(r) === kind);
  const pinned = ofKind.filter(r => r.pinned);
  const ai = ofKind.filter(r => !r.pinned);
  return [...pinned, ...ai].slice(0, n);
}

/** Pinned phrases first (order preserved), then AI; mapped to text, capped at n. Starters excluded. */
export function topPhrases(rows: SavedPhrase[], n: number): string[] {
  return topRows(rows, n, 'phrase').map(r => r.text);
}

/**
 * Whether the user keeps a phrase with this text.
 *
 * The stripe carries text only, not the row it came from, so the pin in the
 * gutter asks here. The panel reads `row.pinned` directly.
 */
export function isKept(text: string, rows: SavedPhrase[]): boolean {
  const key = text.trim().toLowerCase();
  return rows.some(r => r.pinned && r.text.trim().toLowerCase() === key);
}

/**
 * The row for a phrase the user keeps, or nothing when the space holds it.
 *
 * Talk and Notes both keep a row from the gutter of the stripe, and the two
 * must write the same row. The code comes from the generator here, so a model
 * never chooses one.
 */
export function pinnedPhrase(
  text: string,
  spaceId: string,
  rows: SavedPhrase[],
  at: number = Date.now(),
): SavedPhrase | null {
  const key = text.trim().toLowerCase();
  if (rows.some(r => r.text.trim().toLowerCase() === key)) return null;

  return {
    id: crypto.randomUUID(),
    space_id: spaceId,
    text,
    kind: 'phrase',
    code: generateCode(text, {
      existingCodes: rows
        .map(r => r.code)
        .filter((code): code is string => Boolean(code)),
    }),
    pinned: true,
    created_at: at,
    updated_at: at,
  };
}

/**
 * Starter word-count bounds — a starter is an opening prefix, not a sentence.
 * The prompt asks for 3-5 words; these are deliberately one word looser on
 * each side so near-miss model output isn't thrown away.
 */
const STARTER_MIN_WORDS = 2;
const STARTER_MAX_WORDS = 6;

/**
 * Clamp LLM starter output in code rather than over-validating the schema:
 * trim, drop blanks, and drop anything outside the tolerance bounds above.
 */
export function sanitizeStarters(starters: string[]): string[] {
  return starters
    .map(s => s.trim())
    .filter(s => {
      if (!s) return false;
      const words = s.split(/\s+/).length;
      return words >= STARTER_MIN_WORDS && words <= STARTER_MAX_WORDS;
    });
}

export type PhraseSyncAction = 'seed' | 'regen' | 'none';

/**
 * Decide whether to seed (never generated yet), regenerate (seeded but stale),
 * or do nothing for a space's AI phrases.
 */
export function decidePhraseSync({
  syncedCount,
  messageCount,
  hasContext = false,
  threshold = PHRASES_STALE_AFTER,
}: {
  syncedCount: number | undefined;
  messageCount: number;
  /**
   * The space holds a note. A space made from a note holds no message yet,
   * and its stripe would stay empty without this — the note alone is enough
   * for a model to write the first phrases.
   */
  hasContext?: boolean;
  threshold?: number;
}): PhraseSyncAction {
  if (syncedCount == null) {
    return messageCount >= 1 || hasContext ? 'seed' : 'none';
  }
  return messageCount - syncedCount >= threshold ? 'regen' : 'none';
}

const PHRASES_SYSTEM_PROMPT = `You maintain a short list of ready-to-speak phrases for a User of a communication app, so they can speak with fewer keystrokes.

<task>
Given the User's current saved phrases and starters, their space context (who they are talking to and why), and recent conversation history, return:
- "phrases": an updated set of 6-8 short COMPLETE phrases the User is likely to want to say next.
- "starters": 4-6 sentence starters — 3-5 word opening prefixes the User would begin a sentence with.
</task>

<rules>
- Everything is first person — something the User would SAY (never a reply from someone else).
- In the conversation history, "Me:" lines are the User's own words; "Them:" lines are the other person's. Generate only what the User (Me) would say next.
- Entries marked [pinned] are kept by the app automatically — do NOT return them or near-duplicates of them.
- Your output replaces the unmarked entries: carry forward the ones still worth keeping, drop stale ones, and add what the recent history suggests.
- Phrases are complete, natural, speakable thoughts. Starters are incomplete openings that invite completion.
- The space context and the User's own words decide the subject of every row. Do NOT add phrases about needs, care, health, or thanks unless the context or the history raises them.
- STRICTLY keep the same language as the context and history.
- Return 6-8 phrases and 4-6 starters.
</rules>`;

/** A phrase or starter row as embedded in the prompt — pinned rows get a [pinned] marker. */
export interface PromptPhrase {
  text: string;
  pinned: boolean;
}

/** History lines for the phrases prompt — "Me:" is the User, "Them:" transcribed speech. */
export function formatPhraseHistory(messages: Pick<Message, "type" | "text">[]): string[] {
  return messages.map(m => `${m.type === 'transcription' ? 'Them' : 'Me'}: ${m.text}`);
}

function promptRow(p: PromptPhrase): string {
  return p.pinned ? `- [pinned] ${p.text}` : `- ${p.text}`;
}

/**
 * Build the system + user prompt for AI phrase generation. The full existing
 * collection is embedded so the model refines the set rather than re-deriving
 * it blindly; pinned rows are marked so the model can avoid duplicating them.
 */
export function buildPhrasesPrompt({
  existing,
  existingStarters = [],
  history,
  context,
}: {
  existing: PromptPhrase[];
  existingStarters?: PromptPhrase[];
  /** Pre-formatted "Me:"/"Them:" lines — see formatPhraseHistory. */
  history: string[];
  context?: string;
}): { system: string; prompt: string } {
  const sections: string[] = [];

  sections.push(
    existing.length > 0
      ? `Current saved phrases:\n${existing.map(promptRow).join('\n')}`
      : 'Current saved phrases: (none yet)'
  );

  if (existingStarters.length > 0) {
    sections.push(`Current starters:\n${existingStarters.map(promptRow).join('\n')}`);
  }

  const ctx = context?.trim();
  if (ctx) sections.push(`Context:\n${ctx}`);

  if (history.length > 0) {
    sections.push(`Recent conversation ("Me" is the User):\n${history.join('\n')}`);
  }

  return { system: PHRASES_SYSTEM_PROMPT, prompt: sections.join('\n\n') };
}

/**
 * Frequency mining for shortcut proposals — all local, no LLM.
 *
 * Scans recent user messages for repeated sentences and repeated 3–8-word
 * phrases inside them, and proposes `phrase + code` pairs the user might want
 * as shortcuts ("you've typed this 9× — keep `tvd`?"). Codes come from the
 * same deterministic generator seeding uses, so collision rules are uniform.
 */


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
  now?: number;
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
  const { existingPhrases, dismissed, isWord = isCommonWord, now = Date.now() } = options;

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
      const ageDays = Math.max(0, (now - scanned[m].created_at) / MS_PER_DAY);
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

/**
 * The phrases a first space starts with, so the stripe is never empty.
 *
 * The web app seeds the same three. They are pinned, so a regeneration never
 * takes them away.
 */
export const STARTER_PACK: { text: string; code: string }[] = [
  { text: "Thank you", code: "ty" },
  { text: "I want to go to the bathroom", code: "iwb" },
  { text: "How are you?", code: "hru" },
];
