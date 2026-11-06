import { DEFAULT_TONE, PRESENT_TONES, type PresentToneKey } from "./stage.ts";

/** What the app remembers between presentations. */
export interface PresentSettings {
  tone: PresentToneKey;
  spoken: boolean;
}

/**
 * The saved answer, or the one to start from.
 *
 * A presentation speaks unless the user turned the sound off, because a note
 * is written to be heard.
 */
export function presentSettings(saved: unknown): PresentSettings {
  const value = (saved ?? {}) as Partial<PresentSettings>;
  const tone = PRESENT_TONES.some((one) => one.key === value.tone)
    ? (value.tone as PresentToneKey)
    : DEFAULT_TONE;

  return { tone, spoken: value.spoken !== false };
}
