export const DAY_MS = 24 * 60 * 60 * 1000;

/** The weight of something `ageMs` old, when the weight halves every `halfLifeMs`. */
export const halfLifeWeight = (ageMs: number, halfLifeMs: number): number =>
  Math.pow(0.5, Math.max(0, ageMs) / halfLifeMs);
