/**
 * The ElevenLabs voice models and the sound presets of the Talk rail.
 *
 * The values follow the ElevenLabs documentation, read on 2026-09-25.
 * Turbo v2.5 is deprecated, and Flash v2.5 replaces it. Eleven v3 has no
 * similarity setting, and it takes three stability modes, not a range.
 */

export const DEFAULT_VOICE_MODEL = "eleven_flash_v2_5";

/** The models of the Voice tab, fastest first. */
export const VOICE_MODELS = [
  { id: "eleven_flash_v2_5", name: "Eleven Flash v2.5", note: "Fastest" },
  { id: "eleven_multilingual_v2", name: "Eleven Multilingual v2", note: "Best quality" },
  { id: "eleven_v3", name: "Eleven v3", note: "Most expressive" },
] as const;

const REPLACED: Record<string, string> = {
  eleven_turbo_v2_5: "eleven_flash_v2_5",
  eleven_turbo_v2: "eleven_flash_v2",
};

/** A saved model id, with a deprecated model read as its replacement. */
export const voiceModelFrom = (id: string): string => REPLACED[id] ?? id;

/** Eleven v3 has no similarity setting. */
export const hasSimilarity = (modelId: string): boolean =>
  modelId !== "eleven_v3";

/** The three stability modes of Eleven v3, in the words of ElevenLabs. */
export const V3_STABILITY = [
  { label: "Robust", value: 1 },
  { label: "Natural", value: 0.5 },
  { label: "Creative", value: 0 },
] as const;

/** A stability value the model accepts. Eleven v3 takes one of three modes. */
export function stabilityFor(modelId: string, stability: number): number {
  if (hasSimilarity(modelId)) return stability;
  return V3_STABILITY.reduce((near, mode) =>
    Math.abs(mode.value - stability) < Math.abs(near.value - stability)
      ? mode
      : near,
  ).value;
}

export type ExpressionKey = "steady" | "natural" | "expressive";

/**
 * The presets. Each one sets the stability and keeps the model. On Eleven v3,
 * each one takes one of the three stability modes.
 */
export const EXPRESSIONS: readonly {
  key: ExpressionKey;
  label: string;
  stability: number;
  v3Stability: number;
}[] = [
  { key: "steady", label: "Steady", stability: 0.75, v3Stability: 1 },
  { key: "natural", label: "Natural", stability: 0.5, v3Stability: 0.5 },
  { key: "expressive", label: "Expressive", stability: 0.35, v3Stability: 0 },
];

const PRESET_SIMILARITY = 0.75;

export interface VoiceSound {
  modelId: string;
  stability: number;
  similarity: number;
}

/** The stability and similarity of one preset on one model. */
export function expressionSound(
  key: ExpressionKey,
  modelId: string = DEFAULT_VOICE_MODEL,
): Omit<VoiceSound, "modelId"> {
  const preset = EXPRESSIONS.find((one) => one.key === key)!;
  return {
    stability: hasSimilarity(modelId) ? preset.stability : preset.v3Stability,
    similarity: PRESET_SIMILARITY,
  };
}

/**
 * The preset that makes this sound, or `custom` when none does. Eleven v3 has
 * no similarity, so only its stability counts.
 */
export function expressionOf(sound: VoiceSound): ExpressionKey | "custom" {
  const preset = EXPRESSIONS.find(({ key }) => {
    const one = expressionSound(key, sound.modelId);
    return (
      one.stability === sound.stability &&
      (!hasSimilarity(sound.modelId) || one.similarity === sound.similarity)
    );
  });
  return preset?.key ?? "custom";
}

/** An account voice as the voice list reads it. */
export interface ListedVoice {
  id: string;
  name: string;
  /** `premade`, `cloned`, `generated`, `professional`, and more, from ElevenLabs. */
  category?: string | null;
  /** True for a voice the user made. A library voice they added is false. */
  is_owner?: boolean | null;
}

export type VoiceGroup =
  | "Yours"
  | "Heard lately"
  | "From the library"
  | "ElevenLabs voices";

/** One row of the voice list: a short name, its description, and a group. */
export interface VoiceRow {
  id: string;
  name: string;
  detail?: string;
  group: VoiceGroup;
}

const HEARD_LIMIT = 3;
const MADE_CATEGORIES = new Set(["cloned", "generated"]);

/**
 * Where a voice came from.
 *
 * ElevenLabs sets `is_owner` on a voice the user cloned or designed. A
 * professional voice added from the library has `is_owner: false`, so the
 * category alone does not say whose it is. An older answer without
 * `is_owner` falls back to the category.
 */
function sourceOf(voice: ListedVoice): Exclude<VoiceGroup, "Heard lately"> {
  const mine = voice.is_owner ?? MADE_CATEGORIES.has(voice.category ?? "");
  if (mine) return "Yours";
  return voice.category === "premade" ? "ElevenLabs voices" : "From the library";
}

/** The groups after Heard lately, in order. */
const LATER_GROUPS = ["From the library", "ElevenLabs voices"] as const;

/**
 * The voice list in the order the Voice screen shows it.
 *
 * The voices the user made come first, then the voices heard lately, newest
 * first, then the voices added from the library, then the stock ElevenLabs
 * voices. Each group other than Heard lately is sorted by name. ElevenLabs
 * names many voices "Name - description", so the description moves to a
 * second line.
 */
export function voiceRows<V extends ListedVoice>(
  voices: readonly V[],
  heard: readonly string[],
): (VoiceRow & { voice: V })[] {
  const row = (voice: V, group: VoiceGroup) => {
    const [name, ...rest] = voice.name.split(/\s+[-–—]\s+/);
    const detail = rest.join(" - ");
    return detail
      ? { id: voice.id, name, detail, group, voice }
      : { id: voice.id, name: voice.name, group, voice };
  };
  const byName = (a: V, b: V) => a.name.localeCompare(b.name);

  const own = voices.filter((voice) => sourceOf(voice) === "Yours");
  const recent = heard
    .map((id) => voices.find((voice) => voice.id === id))
    .filter((voice): voice is V => !!voice && !own.includes(voice));
  const rest = voices.filter((voice) => !own.includes(voice) && !recent.includes(voice));

  return [
    ...[...own].sort(byName).map((voice) => row(voice, "Yours")),
    ...recent.map((voice) => row(voice, "Heard lately")),
    ...LATER_GROUPS.flatMap((group) =>
      rest
        .filter((voice) => sourceOf(voice) === group)
        .sort(byName)
        .map((voice) => row(voice, group)),
    ),
  ];
}

/** The voices heard lately, with the one heard now first. */
export const heardVoices = (heard: readonly string[], id: string): string[] =>
  [id, ...heard.filter((one) => one !== id)].slice(0, HEARD_LIMIT);
