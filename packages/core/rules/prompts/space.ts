/** The prompt that names a new space and writes its first note, and how its answer reads. */

/**
 * Two screens ask for this: the new-space screen with what the user wrote
 * about the space, and Talk with the first message. The note that comes back
 * goes under the words of the user, never over them.
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
