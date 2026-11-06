/**
 * The tokens that the language model learns from.
 *
 * `Intl.Segmenter` finds the words, so contractions such as `don't`, numbers,
 * and CJK text come out whole. Each sentence is wrapped in `<s>` and `</s>`
 * marks, because messages often open with the same few words. An audio tag
 * holds spaces, so it is cut out before the segmenter sees the text.
 */

import { isTag, splitTags } from '../rules/audio-tags.ts';

export type TokenKind = 'word' | 'punct' | 'emoji' | 'tag' | 'sentence-start' | 'sentence-end';

export interface Token {
  /** Lowercase for words and tags, as written for everything else. */
  normalized: string;
  kind: TokenKind;
}

const SENTENCE_TERMINATORS = new Set(['.', '!', '?', '…', '。', '！', '？']);
const EMOJI = /\p{Extended_Pictographic}/u;
// Building a segmenter takes about 50 µs, and this runs on every keystroke.
const SEGMENTER = new Intl.Segmenter('en', { granularity: 'word' });

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let inSentence = false;

  const push = (normalized: string, kind: TokenKind) => {
    if (!inSentence) out.push({ normalized: '<s>', kind: 'sentence-start' });
    inSentence = true;
    out.push({ normalized, kind });
  };
  const closeSentence = () => {
    if (inSentence) out.push({ normalized: '</s>', kind: 'sentence-end' });
    inSentence = false;
  };

  for (const part of splitTags(text)) {
    if (isTag(part)) {
      push(part.toLowerCase(), 'tag');
      continue;
    }
    for (const { segment, isWordLike } of SEGMENTER.segment(part)) {
      if (!segment.trim()) continue;
      if (isWordLike) push(segment.toLowerCase(), 'word');
      else if (EMOJI.test(segment)) push(segment, 'emoji');
      else {
        push(segment, 'punct');
        if (SENTENCE_TERMINATORS.has(segment)) closeSentence();
      }
    }
  }
  closeSentence();
  return out;
}
