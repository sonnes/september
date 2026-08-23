import { useEffect, useRef } from "react";

import { generate, hasWritingService, itemsFrom } from "@/services/ai";
import {
  call,
  useReplaceAiPhrases,
  useUpdateSpace,
  type Message,
  type Space,
} from "@/services/data";
import {
  buildPhrasesPrompt,
  decidePhraseSync,
  dedupeAgainstPinned,
  formatPhraseHistory,
  generateCode,
  rowKind,
  sanitizeStarters,
  type PhraseKind,
  type SavedPhrase,
} from "@/rules/phrases";

/**
 * Keeps the phrases of a space near the conversation.
 *
 * A model writes them the first time the space holds a message, and again
 * after six more. It rewrites only the rows that are not pinned, so a phrase
 * the user keeps is never lost.
 *
 * A user with no writing service reaches none of this. The stripe still holds
 * the pinned phrases, the codes, and the rows from past messages.
 */
export function useSyncPhrases({
  space,
  phrases,
  messages,
}: {
  space: Space | undefined;
  phrases: SavedPhrase[] | undefined;
  messages: Message[] | undefined;
}): void {
  const replace = useReplaceAiPhrases();
  const updateSpace = useUpdateSpace();
  // One run at a time for one space, so a slow model cannot start a second.
  const running = useRef<string | null>(null);

  useEffect(() => {
    if (!space || !phrases || !messages || !hasWritingService()) return;

    const action = decidePhraseSync({
      syncedCount: space.phrases_synced_count ?? undefined,
      messageCount: messages.length,
      hasContext: Boolean(space.context?.trim()),
    });
    if (action === "none" || running.current === space.id) return;

    running.current = space.id;
    void writePhrases({ space, phrases, messages })
      .then(async (rows) => {
        // A model that wrote nothing leaves the count alone, so the next
        // message tries again instead of waiting for six.
        if (rows.length === 0) return;

        await replace.mutateAsync({ spaceId: space.id, phrases: rows });
        await updateSpace.mutateAsync({
          id: space.id,
          phrases_synced_count: messages.length,
        });
      })
      // A service that fails leaves the phrases that are there. The next
      // message tries again.
      .catch(() => undefined)
      .finally(() => {
        running.current = null;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id, space?.phrases_synced_count, phrases?.length, messages?.length]);
}

/**
 * Writes the first phrases of a space, and waits for them.
 *
 * The new-space screen calls this before it opens the space, so the stripe
 * holds words the moment the user arrives. The hook above does the same job
 * for a space that reaches Talk without one.
 *
 * It writes through `call` and not through a mutation, because a screen that
 * awaits it is not always the screen that draws the rows.
 */
export async function seedPhrases(
  space: Space,
  { signal }: { signal?: AbortSignal } = {},
): Promise<void> {
  if (!hasWritingService()) return;

  // The starter pack lands with the space, and the model must see it. A
  // pinned row it repeated would give the stripe the same words twice.
  const phrases = await call<SavedPhrase[]>("phrase_list", {
    space_id: space.id,
  });
  const rows = await writePhrases({ space, phrases, messages: [], signal });
  if (rows.length === 0) return;

  await call("phrase_replace_ai", { space_id: space.id, phrases: rows });
  await call("space_patch", {
    id: space.id,
    phrases_synced_count: 0,
    updated_at: Date.now(),
  });
}

async function writePhrases({
  space,
  phrases,
  messages,
  signal,
}: {
  space: Space;
  phrases: SavedPhrase[];
  messages: Message[];
  /** The screen that waits for the first phrases can give this up. */
  signal?: AbortSignal;
}): Promise<SavedPhrase[]> {
  const rowsOf = (kind: PhraseKind) =>
    phrases
      .filter((row) => rowKind(row) === kind)
      .map((row) => ({ text: row.text, pinned: row.pinned }));

  const { system, prompt } = buildPhrasesPrompt({
    existing: rowsOf("phrase"),
    existingStarters: rowsOf("starter"),
    history: formatPhraseHistory(messages.slice(-30)),
    context: space.context,
  });

  const answer = await generate(
    {
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    },
    { feature: "phrases", signal },
  );

  const pinnedTexts = phrases.filter((row) => row.pinned).map((row) => row.text);
  const fresh = dedupeAgainstPinned(pinnedTexts, itemsFrom(answer, "phrases"));
  const starters = dedupeAgainstPinned(
    pinnedTexts,
    sanitizeStarters(itemsFrom(answer, "starters")),
  );

  // The codes of the new rows are made here, never by the model, so the rules
  // that keep a code away from a real word hold for every row.
  const existingCodes = phrases
    .map((row) => row.code)
    .filter((code): code is string => Boolean(code));
  const at = Date.now();

  const build = (text: string, kind: PhraseKind): SavedPhrase => {
    const code = generateCode(text, { existingCodes });
    if (code) existingCodes.push(code);
    return {
      id: crypto.randomUUID(),
      space_id: space.id,
      text,
      kind,
      code,
      pinned: false,
      created_at: at,
      updated_at: at,
    };
  };

  return [
    ...fresh.map((text) => build(text, "phrase")),
    ...starters.map((text) => build(text, "starter")),
  ];
}
