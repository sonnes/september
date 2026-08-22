import type { Message } from '@/packages/spaces';

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
  history: Message[];
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

  // Format history: each message → "Me: …" or "Them: …"
  const messagesContent = history
    .map(m => `${m.type === 'transcription' ? 'Them' : 'Me'}: ${m.text}`)
    .join('\n');

  const isCompletion = typed.trim().length > 0;

  const system = applyUserContext(isCompletion ? COMPLETION_PROMPT : OPENING_PROMPT, context);
  const user = isCompletion
    ? `Current input: "${typed}"\n\nConversation:\n${messagesContent}`
    : `Conversation:\n${messagesContent}`;

  return { system, user };
}
