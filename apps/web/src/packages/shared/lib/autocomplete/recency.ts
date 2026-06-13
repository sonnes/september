/**
 * Recency-decay math for the predictive language model.
 *
 * We apply exponential decay to n-gram counts so the model tracks
 * "what this user is saying *lately*", not "what this user has said
 * over all of history". Keystroke savings correlate far more strongly
 * with the last ~weeks of history than with anything older.
 *
 *   decayed_count = count · exp(-ln2 · Δt / halfLife)
 *
 * Equivalently, count halves every `halfLife` milliseconds.
 *
 * Default half-life is 60 days (user-tunable). `Infinity` disables decay
 * entirely, which makes the model pure-additive (Phase 1 behaviour) and
 * is important for back-compat tests.
 *
 * The skip window is a write optimization: if Δt < skipWindow we don't
 * bother applying decay (the factor is ~1 anyway, well below floating
 * point noise) — saves an exp() and keeps observations within a single
 * session perfectly integer-counted.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** 60 days. See header comment for rationale. */
export const DEFAULT_HALF_LIFE_MS = 60 * DAY_MS;

/** 1 hour. Observations within this window contribute at full weight. */
export const DEFAULT_DECAY_SKIP_WINDOW_MS = 60 * 60 * 1000;

/** exp(-ln2 · age / halfLife). Clamps to [0, 1]. Returns 1 when decay is off. */
export function decayFactor(ageMs: number, halfLifeMs: number): number {
  if (!Number.isFinite(halfLifeMs) || halfLifeMs <= 0) return 1;
  if (ageMs <= 0) return 1;
  return Math.exp(-Math.LN2 * (ageMs / halfLifeMs));
}

/** count · decayFactor(ageMs, halfLifeMs). */
export function decayCount(count: number, ageMs: number, halfLifeMs: number): number {
  return count * decayFactor(ageMs, halfLifeMs);
}

/** Whether a Δt is small enough (or decay disabled) that we can skip the exp. */
export function shouldSkipDecay(
  lastUpdatedMs: number,
  nowMs: number,
  halfLifeMs: number = DEFAULT_HALF_LIFE_MS,
  skipWindowMs: number = DEFAULT_DECAY_SKIP_WINDOW_MS,
): boolean {
  if (!Number.isFinite(halfLifeMs) || halfLifeMs <= 0) return true;
  const dt = nowMs - lastUpdatedMs;
  return dt <= skipWindowMs;
}

/** Convenience for user-facing settings. `Infinity` passes through. */
export function halfLifeFromDays(days: number): number {
  if (!Number.isFinite(days)) return Infinity;
  return days * DAY_MS;
}
