import { describe, expect, it } from "vitest";

import { DAY_MS } from "../time.ts";
import type { SavedPhrase } from "../records.ts";
import { mineShortcuts, normalizeMinedText } from "./mining.ts";

const NOW = 1_000 * DAY_MS;

const said = (text: string, times: number, at = NOW) =>
  Array.from({ length: times }, (_, index) => ({
    type: "user",
    text,
    created_at: at - index,
  }));

const saved = (text: string, code?: string): SavedPhrase => ({
  id: text,
  space_id: "space",
  text,
  kind: "phrase",
  code,
  pinned: true,
  created_at: 0,
  updated_at: 0,
});

const mine = (
  messages: ReturnType<typeof said>,
  { existing = [] as SavedPhrase[], dismissed = [] as string[] } = {},
) =>
  mineShortcuts(messages, {
    existingPhrases: existing,
    dismissed: new Set(dismissed),
    now: NOW,
  });

describe("mineShortcuts", () => {
  it("proposes a sentence the user says five times, with a code", () => {
    const [idea] = mine(said("Could you turn on the fan?", 5));

    expect(idea.text).toBe("Could you turn on the fan");
    expect(idea.count).toBe(5);
    expect(idea.code).toMatch(/^[a-z]+$/);
  });

  it("proposes nothing for a sentence said four times", () => {
    expect(mine(said("Could you turn on the fan?", 4))).toEqual([]);
  });

  it("reads only the messages of the user", () => {
    const messages = said("Could you turn on the fan?", 5).map((message) => ({
      ...message,
      type: "assistant",
    }));

    expect(mine(messages)).toEqual([]);
  });

  it("does not propose a phrase the user saved or dismissed", () => {
    const messages = said("Could you turn on the fan?", 5);

    expect(mine(messages, { existing: [saved("could you turn on the fan")] })).toEqual([]);
    expect(
      mine(messages, { dismissed: [normalizeMinedText("Could you turn on the fan?")] }),
    ).toEqual([]);
  });

  it("gives a code that no saved phrase holds", () => {
    const messages = said("Could you turn on the fan?", 5);
    const [first] = mine(messages);

    const [second] = mine(messages, { existing: [saved("Something else", first.code)] });

    expect(second.code).not.toBe(first.code);
  });

  it("proposes the whole sentence, not the parts inside it", () => {
    const ideas = mine(said("Could you turn on the fan?", 6));

    expect(ideas.map((idea) => idea.text)).toEqual(["Could you turn on the fan"]);
  });

  it("puts a recent habit before an old one", () => {
    const ideas = mine([
      ...said("Please open the window wide", 5, NOW - 365 * DAY_MS),
      ...said("Please close the door softly", 5),
    ]);

    expect(ideas.map((idea) => idea.text)).toEqual([
      "Please close the door softly",
      "Please open the window wide",
    ]);
  });
});
