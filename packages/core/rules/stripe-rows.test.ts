import { describe, expect, it } from "vitest";

import type { SavedPhrase } from "./records.ts";
import { stripeRows } from "./stripe-rows.ts";

const phrase = (text: string, extra: Partial<SavedPhrase> = {}): SavedPhrase => ({
  id: text,
  space_id: "home",
  text,
  kind: "phrase",
  pinned: true,
  created_at: 1,
  updated_at: 1,
  ...extra,
});

const input = {
  text: "",
  spaceId: "home",
  spacePhrases: [] as SavedPhrase[],
  allPhrases: [] as SavedPhrase[],
  history: [] as string[],
  fromModel: [] as string[],
  selected: null,
  sliceWords: 4,
};

describe("stripeRows", () => {
  it("offers the kept phrases of the space and marks them kept", () => {
    const rows = stripeRows({ ...input, spacePhrases: [phrase("I need a drink of water")] });
    expect(rows.map((row) => [row.text, row.kept])).toContainEqual(["I need a drink of water", true]);
  });

  it("puts a typed code first, from any space", () => {
    const coffee = phrase("Could I have a coffee please", { space_id: "work", code: "cof" });
    const rows = stripeRows({ ...input, text: "cof", allPhrases: [coffee] });
    expect(rows[0]).toMatchObject({ source: "code", code: "cof" });
  });

  it("keeps the row the user took from first while the draft follows it", () => {
    const first = stripeRows({ ...input, fromModel: ["See you at the park later"] })[0];
    const rows = stripeRows({ ...input, text: "See you", fromModel: ["Something else"], selected: first });
    expect(rows[0].text).toBe("See you at the park later");
  });
});
