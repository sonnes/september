/**
 * Unicode-aware tokenizer for the predictive engine.
 *
 * Uses `Intl.Segmenter('en', { granularity: 'word' })` as the backbone so we
 * get correct word segmentation for contractions (`don't`), numbers, URLs, and
 * CJK; then classifies each non-whitespace segment into `word | punct | emoji`
 * and inserts synthetic `<s>` / `</s>` sentence-boundary markers so the
 * downstream n-gram model can condition on sentence starts.
 *
 * Why sentence markers matter for an assistive app: messages to the same
 * contact often begin with a small set of openers ("hey", "i'll", "sorry,
 * but"). Conditioning the 3-gram and 5-gram models on `<s>` captures that
 * habit and is the single biggest easy win after `yes → I` is the default
 * prediction in the cold-start trigram bucket.
 *
 * Output contract:
 *
 *   - `<s>` and `</s>` tokens have zero-width offsets (`start === end`)
 *     aligned with the adjacent real content.
 *   - Word tokens carry the original-case `text` plus a pre-lowered
 *     `normalized` form. The n-gram model keys on `normalized`. UI layers
 *     (autocomplete popup) can show `text` for display consistency.
 *   - Emoji graphemes are grouped by the segmenter as non-word-like but
 *     isolated; we detect them with `\p{Extended_Pictographic}` to separate
 *     them from ASCII punctuation.
 *   - Whitespace-only segments are dropped — the upstream caller never sees
 *     them. Sentence boundaries handle the "this is the end of a phrase"
 *     signal instead.
 */

export type TokenKind =
  | 'word'
  | 'punct'
  | 'emoji'
  /** An audio tag such as `[laughs]`: a direction to the voice, kept whole. */
  | 'tag'
  | 'sentence-start'
  | 'sentence-end';

export interface Token {
  /** Display text, original casing preserved. */
  text: string;
  /** Lookup key for model (lowercased for words; identical to text otherwise). */
  normalized: string;
  kind: TokenKind;
  /** Inclusive start offset into the source string. */
  start: number;
  /** Exclusive end offset into the source string. */
  end: number;
}

const SENTENCE_TERMINATORS = new Set(['.', '!', '?', '…', '。', '！', '？']);
const EMOJI_RE = /\p{Extended_Pictographic}/u;
const TAG_RE = /\[[^[\]]+\]/g;

// Cached because Intl.Segmenter construction is ~50µs per call and tokenize is
// called on every keystroke during predictive suggestion.
const SEGMENTER = new Intl.Segmenter('en', { granularity: 'word' });

export function tokenize(text: string): Token[] {
  if (!text) return [];

  const out: Token[] = [];
  let inSentence = false;

  const openSentenceAt = (pos: number) => {
    if (inSentence) return;
    out.push({
      text: '<s>',
      normalized: '<s>',
      kind: 'sentence-start',
      start: pos,
      end: pos,
    });
    inSentence = true;
  };

  const closeSentenceAt = (pos: number) => {
    if (!inSentence) return;
    out.push({
      text: '</s>',
      normalized: '</s>',
      kind: 'sentence-end',
      start: pos,
      end: pos,
    });
    inSentence = false;
  };

  const segmentPart = (part: string, offset: number) => {
    for (const seg of SEGMENTER.segment(part)) {
      const s = seg.segment;
      if (!s.trim()) continue;

      const start = offset + seg.index;
      const end = start + s.length;

      if (seg.isWordLike) {
        openSentenceAt(start);
        out.push({
          text: s,
          normalized: s.toLowerCase(),
          kind: 'word',
          start,
          end,
        });
        continue;
      }

      if (EMOJI_RE.test(s)) {
        openSentenceAt(start);
        out.push({ text: s, normalized: s, kind: 'emoji', start, end });
        continue;
      }

      openSentenceAt(start);
      out.push({ text: s, normalized: s, kind: 'punct', start, end });
      if (SENTENCE_TERMINATORS.has(s)) closeSentenceAt(end);
    }
  };

  // A tag holds spaces, so it never reaches the word segmenter.
  let cursor = 0;
  for (const match of text.matchAll(TAG_RE)) {
    const start = match.index;
    segmentPart(text.slice(cursor, start), cursor);
    openSentenceAt(start);
    out.push({
      text: match[0],
      normalized: match[0].toLowerCase(),
      kind: 'tag',
      start,
      end: start + match[0].length,
    });
    cursor = start + match[0].length;
  }
  segmentPart(text.slice(cursor), cursor);

  closeSentenceAt(text.length);
  return out;
}
