/** The unsent words and the mood of each Talk space, kept as device settings. */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { platform } from "@platform/adapter";
import { moodFrom, type MoodKey } from "@september/core/rules/moods";
import { talkDraftKey, talkMoodKey } from "@september/core/rules/settings";

const draftKey = (spaceId: string) => ["talk-draft", spaceId];
const moodKey = (spaceId: string) => ["talk-mood", spaceId];

/** The unsent words of a space. The spoken transcript is not a setting. */
export function useTalkDraft(spaceId: string | undefined) {
  return useQuery({
    queryKey: draftKey(spaceId ?? ""),
    queryFn: async () =>
      (await platform.store.getSetting<string>(talkDraftKey(spaceId!))) ?? "",
    enabled: Boolean(spaceId),
  });
}

/** Keeps the unsent words of a space. */
export function useSaveTalkDraft(spaceId: string) {
  const client = useQueryClient();
  return async (words: string) => {
    await platform.store.putSetting(talkDraftKey(spaceId), words);
    client.setQueryData(draftKey(spaceId), words);
  };
}

/**
 * The mood of a Talk space. It stays until the user presses its key again.
 * A failed save puts the mood back and gives a problem to show.
 */
export function useTalkMood(spaceId: string): {
  mood: MoodKey | null;
  choose: (next: MoodKey | null) => void;
  problem: string | null;
} {
  const client = useQueryClient();
  const [problem, setProblem] = useState<string | null>(null);
  const saved = useQuery({
    queryKey: moodKey(spaceId),
    queryFn: async () => moodFrom(await platform.store.getSetting(talkMoodKey(spaceId))),
  });
  const choose = (next: MoodKey | null) => {
    const before = saved.data ?? null;
    setProblem(null);
    client.setQueryData(moodKey(spaceId), next);
    platform.store.putSetting(talkMoodKey(spaceId), next).catch((reason: unknown) => {
      console.error("September did not keep the mood.", reason);
      client.setQueryData(moodKey(spaceId), before);
      setProblem("September did not keep the mood. Try again.");
    });
  };
  return { mood: saved.data ?? null, choose, problem };
}
