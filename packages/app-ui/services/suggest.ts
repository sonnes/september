/**
 * The words that the app offers while the user writes. One engine serves the
 * whole app. It learns the seed words at the first request, and then each
 * message of the user once.
 */
import { useEffect, useRef, useState } from "react";

import {
  createEngine,
  suggestionsFor,
  type Autocomplete,
} from "@september/core/autocomplete";
import type { SavedSetup } from "@september/core/rules/onboarding";
import type { MoodKey } from "@september/core/rules/moods";
import { buildSuggestionPrompt } from "@september/core/rules/prompts/suggestions";
import { tagsSpoken } from "@september/core/rules/audio-tags";

import { generate, hasWritingService, itemsFrom, userContext } from "./ai";
import { useAllMessages } from "./data";
import { useSpeechSettings } from "./speech";

/** The delay after a qualifying edit before a model request. */
const THINK_AFTER_MS = 200;

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

  // The engine changes in place, so a new read draws the words again.
  const [, setReadCount] = useState(0);

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

  return suggestionsFor(theEngine(), draft, spaceId);
}

/** The last rows of the stripe, from the writing service. */
export function useCompletions({
  text,
  context,
  history,
  spaceId,
  setup,
  mood,
  document,
}: {
  text: string;
  context: string;
  history: string[];
  spaceId: string;
  setup: SavedSetup | null;
  mood: MoodKey | null;
  document?: { before: string; after: string };
}): { rows: string[]; writing: boolean; problem: string | null } {
  // The note changes with every key, and only an edit of the typed words asks
  // again. The request reads the note as it stands when it leaves.
  const note = useRef(document);
  note.current = document;
  const [rows, setRows] = useState<string[]>([]);
  // A request is on its way to the model.
  const [writing, setWriting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const enabled = setup?.autoSuggestions !== false;
  const settingsKey = JSON.stringify([
    setup?.defaultModel, setup?.suggestionsModel, setup?.speakingStyle, setup?.personalWords,
  ]);
  // The voice decides whether a suggestion can hold audio tags.
  const tags = tagsSpoken(useSpeechSettings());
  const previous = useRef({ text, spaceId, enabled, settingsKey, mood });
  const historyKey = JSON.stringify(history.slice(-20));

  useEffect(() => {
    // A new mood asks again at once, because the user wants its tone now.
    const edited = (previous.current.text !== text || previous.current.mood !== mood) &&
      previous.current.spaceId === spaceId && previous.current.enabled === enabled &&
      previous.current.settingsKey === settingsKey;
    previous.current = { text, spaceId, enabled, settingsKey, mood };
    setRows([]);
    setWriting(false);
    setProblem(null);
    if (!edited || !enabled || !text.trim() ||
      !/[\s.,!?;:]$/.test(text) || !hasWritingService("suggestions")) return;

    const dropped = new AbortController();
    const timer = setTimeout(() => {
      setWriting(true);
      const { system, user } = buildSuggestionPrompt({
        globalMd: userContext(),
        spaceMd: context,
        history: (JSON.parse(historyKey) as string[]).map((one) => `Me: ${one}`),
        typed: text,
        mood,
        tags,
        document: note.current,
      });

      generate(
        {
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        },
        { feature: "suggestions", signal: dropped.signal },
      )
        .then((answer) => {
          if (!dropped.signal.aborted) setRows(itemsFrom(answer, "suggestions"));
        })
        .catch((reason: unknown) => {
          if (dropped.signal.aborted) return;
          setRows([]);
          setProblem(
            `AI Assistance did not answer. ${reason instanceof Error ? reason.message : String(reason)}`,
          );
        })
        .finally(() => {
          if (!dropped.signal.aborted) setWriting(false);
        });
    }, THINK_AFTER_MS);

    return () => {
      clearTimeout(timer);
      dropped.abort();
    };
  }, [text, spaceId, enabled, settingsKey, context, historyKey, mood, tags]);

  return { rows, writing, problem };
}
