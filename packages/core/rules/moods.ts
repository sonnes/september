/**
 * The mood of a conversation, which the five emoji keys of the composer set.
 *
 * A mood changes the instructions of the suggestion prompt, so it changes the
 * wording for every voice. Its example tags guide the tags of a suggestion
 * when the voice reads tags. The model can choose other tags.
 */

export type MoodKey = "warm" | "playful" | "low" | "frustrated" | "angry";

export interface Mood {
  key: MoodKey;
  emoji: string;
  label: string;
  /** The instructions of the prompt, one sentence each. */
  lines: readonly string[];
  /** Examples for the model. They are not a limit. */
  tags: readonly string[];
}

export const MOODS: readonly Mood[] = [
  {
    key: "warm",
    emoji: "😊",
    label: "Warm",
    lines: ["The user feels warm.", "Write the suggestions in a kind, warm tone."],
    tags: ["warmly", "happy", "chuckles"],
  },
  {
    key: "playful",
    emoji: "😄",
    label: "Playful",
    lines: [
      "The user feels playful.",
      "Write the suggestions in a playful tone.",
      "Light jokes are good.",
    ],
    tags: ["laughs", "giggles", "mischievously", "sarcastic"],
  },
  {
    key: "low",
    emoji: "😔",
    label: "Low",
    lines: [
      "The user feels low or tired.",
      "Write short, quiet suggestions.",
      "Do not try to change the mood of the user.",
    ],
    tags: ["sighs", "sad", "exhales"],
  },
  {
    key: "frustrated",
    emoji: "😤",
    label: "Frustrated",
    lines: [
      "The user feels frustrated.",
      "Write direct suggestions.",
      "Keep them clear, not rude.",
    ],
    tags: ["annoyed", "frustrated sigh", "exhales sharply"],
  },
  {
    key: "angry",
    emoji: "😠",
    label: "Angry",
    lines: [
      "The user feels angry.",
      "Write firm, strong suggestions.",
      "Do not use insults or swear words.",
    ],
    tags: ["angry", "shouting", "firmly"],
  },
];

/** The example tags when no mood is chosen. */
const DEFAULT_TAGS = ["laughs", "sighs", "whispers", "excited", "curious"];

/** A saved mood, or null for anything that is not a mood. */
export function moodFrom(value: unknown): MoodKey | null {
  return MOODS.find((mood) => mood.key === value)?.key ?? null;
}

/** The mood block of the prompt, or nothing without a mood. */
export function moodBlock(mood: MoodKey | null): string {
  const found = MOODS.find((one) => one.key === mood);
  return found ? `<mood>\n${found.lines.join("\n")}\n</mood>` : "";
}

/** The example tags of the mood, or the default examples. */
export function exampleTags(mood: MoodKey | null): string[] {
  return [...(MOODS.find((one) => one.key === mood)?.tags ?? DEFAULT_TAGS)];
}
