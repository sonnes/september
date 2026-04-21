/**
 * QWERTY keyboard layout proximity model.
 *
 * Used by the fuzzy-completion Levenshtein automaton to weight edit operations
 * by spatial distance: a typo of "teh" → "the" (adjacent t↔r → no… wait: t and h
 * aren't adjacent — but e→s, r→t, h→j are) should cost less than an arbitrary
 * substitution because finger-slip errors dominate on-device typing.
 *
 * The layout is modeled as a staggered ortholinear grid (we ignore the half-key
 * physical stagger; for proximity that approximation is good enough and matches
 * what Gboard/SwiftKey use in their public talks on spatial models).
 *
 * Thresholds (Euclidean distance in key units):
 *   d = 0         → 0.0  (identity)
 *   d ≤ √2        → 0.3  (adjacent incl. diagonal)
 *   d ≤ 3         → 0.7  (same-hand reach)
 *   otherwise     → 1.0  (treat as unrelated substitution)
 *
 * Non-letters (digits, punctuation, accented chars) are not modeled and fall
 * back to the worst-case cost 1.0 so they behave exactly like a regular
 * Levenshtein substitution.
 */

type Coord = readonly [x: number, y: number];

const KEY_COORDS: Readonly<Record<string, Coord>> = {
  q: [0, 0], w: [1, 0], e: [2, 0], r: [3, 0], t: [4, 0],
  y: [5, 0], u: [6, 0], i: [7, 0], o: [8, 0], p: [9, 0],
  a: [0, 1], s: [1, 1], d: [2, 1], f: [3, 1], g: [4, 1],
  h: [5, 1], j: [6, 1], k: [7, 1], l: [8, 1],
  z: [0, 2], x: [1, 2], c: [2, 2], v: [3, 2], b: [4, 2],
  n: [5, 2], m: [6, 2],
};

const SQRT2 = Math.SQRT2;

/**
 * Weighted substitution cost between two single characters.
 *
 * Returns a value in [0, 1]. Caller should use this in place of the standard
 * Levenshtein substitution cost (which is always 1). Insertion and deletion
 * still cost 1 in the calling automaton — we only re-weight substitutions
 * because that's where finger-slip typos concentrate.
 */
export function editCost(a: string, b: string): number {
  if (a === b) return 0;

  // Only single-char substitutions are modeled. Anything else is worst-case.
  if (a.length !== 1 || b.length !== 1) return 1;

  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return 0;

  const ca = KEY_COORDS[la];
  const cb = KEY_COORDS[lb];
  if (!ca || !cb) return 1;

  const dx = ca[0] - cb[0];
  const dy = ca[1] - cb[1];
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= SQRT2) return 0.3;
  if (dist <= 3) return 0.7;
  return 1;
}
