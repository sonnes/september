/**
 * The words that the app offers while the user writes. One engine serves the
 * whole app. It learns the seed words at the first request, and then each
 * message of the user once.
 */
import { useEffect, useMemo, useState } from "react";

import {
  createEngine,
  suggestionsFor,
  type Autocomplete,
} from "@september/core/autocomplete";
import { useAllMessages } from "./data";

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
      theEngine().observe(message.text, message.space_id);
      added += 1;
    }

    if (added > 0) setReadCount((count) => count + added);
  }, [messages]);

  return useMemo(
    () => suggestionsFor(theEngine(), draft, spaceId),
    [draft, spaceId, readCount],
  );
}
