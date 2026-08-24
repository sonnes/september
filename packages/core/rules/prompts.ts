
/**
 * The two prompts for the last rows of a stripe.
 *
 * Both platform suggestion services import the same prompts from this module.
 */

/**
 * Opening-utterance prompt — used when the editor text is empty.
 * Same "next utterance" framing as before.
 */
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
</rules>

{USER_CONTEXT}

Answer with JSON: {"suggestions": ["...", "...", "...", "...", "..."]}`;

/**
 * Completion prompt — used when the editor has in-progress text.
 * Instructs the model to return full sentences that BEGIN with the typed text.
 */
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
</rules>

{USER_CONTEXT}

Answer with JSON: {"suggestions": ["...", "...", "...", "...", "..."]}`;

export interface BuildSuggestionPromptInput {
  globalMd: string;
  spaceMd: string;
  history: string[];
  typed: string;
}

export interface BuildSuggestionPromptResult {
  system: string;
  user: string;
}

/**
 * The `{USER_CONTEXT}` slot filled with the assembled global + space context
 * wrapped in a <user_context> block, or removed entirely when there is none
 * (so no empty tag or dangling reference remains).
 */
function applyUserContext(template: string, context: string): string {
  const block = context ? `<user_context>\n${context}\n</user_context>` : '';
  return template.replace('{USER_CONTEXT}', block).replace(/\n{3,}/g, '\n\n');
}

/**
 * Pure context serializer for the suggestions LLM call.
 *
 * Assembles `system` and `user` strings from the global markdown context,
 * per-space markdown context, conversation history, and the current typed text.
 * Context lives only in the system prompt (via `{USER_CONTEXT}`); the user
 * message carries the typed input and conversation.
 *
 * Branches on whether `typed` has content:
 * - non-empty → completion mode (COMPLETION_PROMPT)
 * - empty/whitespace → opening mode (OPENING_PROMPT)
 */
export function buildSuggestionPrompt(
  input: BuildSuggestionPromptInput
): BuildSuggestionPromptResult {
  const { globalMd, spaceMd, history, typed } = input;

  // Assemble context: trim each piece, drop empties, join with blank line.
  const context = [globalMd, spaceMd]
    .map(s => s.trim())
    .filter(Boolean)
    .join('\n\n');

  // The lines already carry "Me:" or "Them:" — the caller writes them.
  const messagesContent = history.join('\n');

  const isCompletion = typed.trim().length > 0;

  const system = applyUserContext(isCompletion ? COMPLETION_PROMPT : OPENING_PROMPT, context);
  const user = isCompletion
    ? `Current input: "${typed}"\n\nConversation:\n${messagesContent}`
    : `Conversation:\n${messagesContent}`;

  return { system, user };
}

/**
 * The prompt that names a new space and writes its first note.
 *
 * Two screens ask for this. The new-space screen asks with the words that the
 * user wrote about the space, and Talk asks with the first message. The note
 * that comes back goes under the words of the user, and never over them.
 *
 * Ported from `useGenerateSpaceContext` in the web app. Keep it the same in
 * both apps.
 */
const SPACE_CONTEXT_PROMPT = `Produce a title and a starter note for one conversation space of a communication app.

<context>
- The User is using a communication app to speak out loud
- The words below are the User's own. They are either the first thing the User said in this space, or the User's answer to "what is this space for?"
- The note you write goes UNDER those words, after a blank line. The words of the User stay above it, and nothing replaces them.
- The suggestion engine and the phrase engine both read the whole note, so what you write decides the words this space offers.
</context>

<output_format>
- title: Short descriptive name for this space (max 50 chars)
- context: Markdown note with:
  - One or two prose sentences (first person, from the User's perspective) capturing who they are talking to, the situation, and the intent
  - A short list of bullet phrases the User is likely to want to say (using "- " prefix), in the same language and tone as the input
</output_format>

<rules>
- All content must be from the User's point of view (what THEY would say or convey)
- Do NOT repeat the words the User already wrote — add only what they leave unsaid
- Everything you add must follow from those words. Where they are silent, stay silent: do NOT add needs, care, health, or thanks that the words do not raise.
- Bullet phrases are speakable sentence starters or full short phrases
- Keep the context concise — prose: 1-2 sentences; bullets: 4-8 items
- STRICTLY maintain the same language as the input
- Match the style and tone of the input (e.g. casual, formal)
- The context markdown is written in first person as the User
- The title names the person, the place, or the subject — never the health of the User
</rules>

Answer with JSON: {"title": "...", "context": "..."}`;

/** What the model is asked, to name a space from the words of the user. */
export function buildSpaceContextPrompt(words: string): {
  system: string;
  user: string;
} {
  return {
    system: SPACE_CONTEXT_PROMPT,
    user: `Words from the User:\n${words}`,
  };
}

/** The name and the note of a space. Either one can be empty. */
export interface SpaceDescription {
  title: string;
  context: string;
}

/** A tab in the dock is small, so a long title is cut to fit. */
const TITLE_LIMIT = 50;

/**
 * The name and the note that the model wrote, and nothing when it wrote
 * neither. A service that answers with something else costs the user nothing.
 */
export function spaceDescriptionFrom(text: string): SpaceDescription | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const row = parsed as Record<string, unknown>;
  const read = (key: string) =>
    typeof row[key] === "string" ? (row[key] as string).trim() : "";

  const title = read("title").slice(0, TITLE_LIMIT);
  const context = read("context");

  return title || context ? { title, context } : null;
}
