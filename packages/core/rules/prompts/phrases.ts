/** The prompt that writes the phrases and starters of a space. */

import type { Message } from "../records.ts";
import { TAG_DESCRIBES_VOICE, audioTagsBlock, promptOf } from "./parts.ts";

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

const ANSWER = `Answer with JSON: {"phrases": ["...", "..."], "starters": ["...", "..."]}`;

const PHRASE_TAG_RULES = [
  "A phrase with a clear feeling can start with one audio tag in square brackets, such as [laughs] That is hilarious or [sighs] I am so tired today.",
  "A neutral phrase, such as Thank you, gets no tag. A starter gets no tag.",
  TAG_DESCRIBES_VOICE,
  "[pinned] is a marker of the app, not an audio tag. Never write it in a phrase.",
];

/** A phrase or starter in the prompt. A pinned row gets a [pinned] marker. */
export interface PromptPhrase {
  text: string;
  pinned: boolean;
}

/** The history lines of the prompt. "Me" is the User, and "Them" is transcribed speech. */
export function formatPhraseHistory(messages: Pick<Message, "type" | "text">[]): string[] {
  return messages.map((m) => `${m.type === "transcription" ? "Them" : "Me"}: ${m.text}`);
}

const promptRow = (p: PromptPhrase): string =>
  p.pinned ? `- [pinned] ${p.text}` : `- ${p.text}`;

/**
 * The prompt that writes the phrases of a space.
 *
 * It holds every current row, so the model refines the set. Pinned rows are
 * marked, so the model does not repeat them.
 */
export function buildPhrasesPrompt({
  existing,
  existingStarters = [],
  history,
  context,
  tags = false,
}: {
  existing: PromptPhrase[];
  existingStarters?: PromptPhrase[];
  /** Lines from `formatPhraseHistory`. */
  history: string[];
  context?: string;
  /** True when the voice reads audio tags, so a phrase can hold one. */
  tags?: boolean;
}): { system: string; prompt: string } {
  const ctx = context?.trim();
  const prompt = promptOf([
    existing.length > 0
      ? `Current saved phrases:\n${existing.map(promptRow).join("\n")}`
      : "Current saved phrases: (none yet)",
    existingStarters.length > 0 &&
      `Current starters:\n${existingStarters.map(promptRow).join("\n")}`,
    ctx && `Context:\n${ctx}`,
    history.length > 0 &&
      `Recent conversation ("Me" is the User):\n${history.join("\n")}`,
  ]);
  const system = promptOf([
    PHRASES_SYSTEM_PROMPT,
    tags && audioTagsBlock(PHRASE_TAG_RULES),
    ANSWER,
  ]);
  return { system, prompt };
}
