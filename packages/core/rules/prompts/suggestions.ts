/** The prompts for the suggestion rows of the stripe. */

import { stripTags } from "../audio-tags.ts";
import { exampleTags, moodBlock, type MoodKey } from "../moods.ts";
import { TAG_DESCRIBES_VOICE, audioTagsBlock, promptOf } from "./parts.ts";

/** The prompt for an empty draft: what the User says next. */
const OPENING_PROMPT = `Generate 5 possible NEXT things the User might WANT TO SAY to the person they are speaking with.

<context>
- The User is using a communication app to speak out loud
- The user context below, when provided, says who the User is and what this conversation is. It decides what the User would say next.
- The "Me:" lines below are things the User has already said through the app
- "Them:" lines (if any) are transcriptions of the other person's speech — these are often MISSING because transcription is optional, so most of the time you will only see the User's own utterances
- Because the other side is usually invisible, DO NOT assume the User is answering a question. Assume they are driving the conversation forward and need help saying their NEXT thing
- Think of suggestions as "what would this person most plausibly want to say next to keep this conversation going?"
</context>

<rules>
- Suggestions must be things the User (Me) would say out loud next — never replies FROM the other person
- Do NOT generate answers to a question the User just asked (they asked it, they don't need to answer it)
- Prefer natural continuations of the User's own thread: follow-up questions they might ask, additional things they might add, new related topics, closers, clarifications, or small talk that fits the moment
- Keep suggestions speakable and natural — 5-7 words each; this is spoken conversation, not written text
- Offer variety across the 5 suggestions (e.g. one question, one statement, one topic shift) so the User has real choices
- Take the subject, the tone, and the wording from the user context. Where it is silent, follow the conversation history.
- Do NOT write a suggestion about needs, care, health, or thanks unless the context or the history raises it. The User is a person with a life, not a list of requests.
- STRICTLY maintain the same language as the conversation context
</rules>`;

/** The prompt for a draft: full sentences that begin with the typed words. */
const COMPLETION_PROMPT = `Complete the User's partial input into 5 full spoken sentences.

<context>
- The User is using a communication app to speak out loud
- The "current input" below is what they have typed so far — it may be a partial word, phrase, or sentence
- The user context below, when provided, decides the subject and the tone of every completion
- The "Me:" and "Them:" lines are the recent conversation history for context
</context>

<rules>
- Each of the 5 completions MUST begin with the user's current input verbatim — do NOT rephrase or reword the typed prefix
- Complete the sentence naturally in the same language as the typed input
- Keep completions speakable and natural — full sentences of 5-7 words (including the typed prefix) when the input allows; this is spoken conversation
- Take the subject, the tone, and the wording from the user context. Where it is silent, follow the conversation history.
- Do NOT complete into needs, care, health, or thanks unless the context or the history raises it
</rules>`;

/** A draft of this many words or fewer is a search, so the model can write about it freely. */
const SEARCH_WORDS = 2;

/** The prompt for a draft of one or two words: sentences about what they name. */
const SEARCH_PROMPT = `Write 5 full spoken sentences that the User can want to say about their current input.

<context>
- The User is using a communication app to speak out loud
- The "current input" below is one or two words. The User typed them to find a sentence about them.
- The user context below, when provided, decides the subject and the tone of every sentence
- The "Me:" and "Them:" lines are the recent conversation history for context
</context>

<rules>
- Each sentence MUST be about what the current input refers to, in this conversation
- A sentence can contain the current input at the start, in the middle, or at the end
- A sentence can also use a different form of the input, or other words on the same topic. For example, "water" can give "I am really thirsty".
- Do NOT start every sentence with the current input
- Keep sentences speakable and natural, 5-7 words each. This is spoken conversation.
- Use the same language as the current input
- Take the subject, the tone, and the wording from the user context. Where it is silent, follow the conversation history.
- Do NOT write about needs, care, health, or thanks unless the context or the history raises it
</rules>`;

const ANSWER = `Answer with JSON: {"suggestions": ["...", "...", "...", "...", "..."]}`;

export interface BuildSuggestionPromptInput {
  globalMd: string;
  spaceMd: string;
  history: string[];
  typed: string;
  /** The mood of the conversation. It changes the tone for every voice. */
  mood?: MoodKey | null;
  /** True when the voice reads audio tags, so the suggestions can hold them. */
  tags?: boolean;
  /** The note around the caret, when the User writes a note. It takes the place of the history. */
  document?: { before: string; after: string };
}

/** The mark of the caret in a note. */
const CARET = "<caret/>";

const NOTE_RULES = `<note>
- The User is writing a note, not a spoken message. The full note is below, and ${CARET} marks the caret.
- Each suggestion is the words that go at the caret. They must fit the words before and after the caret.
- Keep the style of the note: its language, its person, and its list or heading format at the caret.
- Do not repeat what the note already says.
</note>`;

const SUGGESTION_TAG_RULES = [
  "You can add audio tags in square brackets, such as [laughs] or [whispers].",
  "Choose any tag that fits the words. The example tags below are examples only.",
  TAG_DESCRIBES_VOICE,
  "Put a tag just before or just after the words that it changes.",
  "Give a tag only to a suggestion that needs one.",
  "Do not change the words that the user typed. A tag can come before them, and the words after the tag still begin with the typed input verbatim.",
];

export interface BuildSuggestionPromptResult {
  system: string;
  user: string;
}

/**
 * The prompt for the suggestion rows.
 *
 * An empty draft opens, a draft of one or two words searches, and a longer
 * draft completes. The context of the User goes in the system prompt only.
 */
export function buildSuggestionPrompt(
  input: BuildSuggestionPromptInput,
): BuildSuggestionPromptResult {
  const { globalMd, spaceMd, history, typed, mood = null, tags = false, document } = input;

  // The mood comes last, after the speaking style and the space.
  const context = [globalMd, spaceMd, moodBlock(mood)]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");

  const isCompletion = typed.trim().length > 0;
  const isSearch =
    isCompletion && stripTags(typed).split(/\s+/).filter(Boolean).length <= SEARCH_WORDS;

  const system = promptOf([
    isSearch ? SEARCH_PROMPT : isCompletion ? COMPLETION_PROMPT : OPENING_PROMPT,
    context && `<user_context>\n${context}\n</user_context>`,
    tags &&
      audioTagsBlock([
        ...SUGGESTION_TAG_RULES,
        `Example tags: ${exampleTags(mood).join(", ")}.`,
      ]),
    document && NOTE_RULES,
    ANSWER,
  ]);
  // The history lines already start with "Me:" or "Them:".
  const background = document
    ? `Note:\n${document.before}${CARET}${document.after}`
    : `Conversation:\n${history.join("\n")}`;
  const user = isCompletion ? `Current input: "${typed}"\n\n${background}` : background;

  return { system, user };
}
