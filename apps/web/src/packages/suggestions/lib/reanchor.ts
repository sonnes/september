/**
 * Client-side prefix re-anchoring — ported from Google Project Voice
 * (pv-app.ts: ignoreUnnecessaryDiffs, constants: MAX_DIFFS, MODIFIABLE_TEXT_LENGTH).
 *
 * Keeps the user's typed prefix verbatim and only allows the model to alter the
 * tail, so stripe tiles collapse correctly from the start.
 */

import { diff_match_patch } from 'diff-match-patch';

/** From Project Voice constants.ts */
const MAX_DIFFS = 10;
/** From Project Voice constants.ts — chars at the end the model may freely rewrite. */
const MODIFIABLE_TEXT_LENGTH = 10;

/**
 * Heuristically removes unnecessary diffs from the LLM result.
 *
 * If the result differs from text in too many places (> MAX_DIFFS) or has no
 * equality spans at all, falls through to `newText` unchanged.
 * Otherwise the prefix (text.length − MODIFIABLE_TEXT_LENGTH chars) is locked
 * to the original typed text; the tail may be the model's version.
 *
 * @param text     - The user's current in-progress typed input.
 * @param newText  - The LLM's completion/continuation candidate.
 * @returns        - A string that begins with `text`'s prefix verbatim.
 */
export function ignoreUnnecessaryDiffs(text: string, newText: string): string {
  const dmp = new diff_match_patch();
  const diffs: [number, string][] = dmp.diff_main(text, newText);
  dmp.diff_cleanupSemantic(diffs);

  if (diffs.length > MAX_DIFFS || diffs.every(diff => diff[0] !== 0)) {
    return newText;
  }

  let result = '';
  for (let i = 0; i < diffs.length; i++) {
    const [op, str] = diffs[i];
    if (result.length < text.length - MODIFIABLE_TEXT_LENGTH) {
      if (op === 0 || op === -1) {
        // Accept the original text (lock prefix).
        result += str;
        // Skip the next diff if it is an insertion just after a deletion.
        if (i < diffs.length - 1 && op === -1 && diffs[i + 1][0] === 1) {
          i++;
        }
      }
    } else {
      if (op === 0 || op === 1) {
        // Accept the new text (allow tail rewrite).
        result += str;
      }
    }
  }

  // If the result is identical to the original text, return the new text.
  if (result === text) {
    return newText;
  }

  return result;
}
