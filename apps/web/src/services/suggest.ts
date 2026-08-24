/**
 * The words that the app offers while the user writes.
 *
 * The rules are in `src/autocomplete/`, which takes no renderer. This file
 * holds the engine and gives it the messages of the user.
 *
 * ponytail: one engine for the whole app, made when a screen first asks for
 * words. It learns again at each start, which costs about 10 ms for the seed
 * words and a few more for the messages. Keep it in memory so the repository
 * remains the only IndexedDB owner.
 */
import { useEffect, useMemo, useState } from "react";

import {
  createEngine,
  suggestionsFor,
  type Autocomplete,
} from "@/packages/shared/lib/autocomplete/index";
import { useAllMessages } from "@/services/data";

export { applySuggestion, MAX_SUGGESTIONS } from "@/packages/shared/lib/autocomplete/index";

let engine: Autocomplete | null = null;

/** The identifiers of the messages that the engine already read. */
const learned = new Set<string>();

function theEngine(): Autocomplete {
  if (!engine) engine = createEngine();
  return engine;
}

/**
 * The words to offer for the text in the composer.
 *
 * The engine reads each message that the user sends one time only. A message
 * that the user did not write does not go in: the app models the words of the
 * user, not the words of the other person.
 */
export function useSuggestions(
  spaceId: string | undefined,
  draft: string,
): string[] {
  const { data: messages } = useAllMessages();

  // The count changes when the engine reads new messages, which makes the
  // words below new again.
  const [readCount, setReadCount] = useState(0);

  useEffect(() => {
    if (!messages) return;

    let added = 0;
    for (const message of messages) {
      if (learned.has(message.id)) continue;
      learned.add(message.id);
      if (message.type !== "user" || !message.space_id) continue;
      theEngine().observe(message.text, { chatId: message.space_id });
      added += 1;
    }

    if (added > 0) setReadCount((count) => count + added);
  }, [messages]);

  return useMemo(
    () => {
      void readCount;
      return suggestionsFor(theEngine(), draft, spaceId);
    },
    [draft, spaceId, readCount],
  );
}
