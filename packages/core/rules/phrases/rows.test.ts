import { describe, expect, it } from "vitest";

import type { PhraseKind, SavedPhrase } from "../records.ts";
import { dedupeAgainstPinned, isKept, pinnedPhrase, topPhrases, topRows } from "./rows.ts";

const row = (
  text: string,
  { pinned = false, kind = "phrase" as PhraseKind, code }: {
    pinned?: boolean;
    kind?: PhraseKind;
    code?: string;
  } = {},
): SavedPhrase => ({
  id: text,
  space_id: "space",
  text,
  kind,
  code,
  pinned,
  created_at: 0,
  updated_at: 0,
});

describe("dedupeAgainstPinned", () => {
  it("drops a model text that a pinned text holds, a repeat, and a blank", () => {
    expect(
      dedupeAgainstPinned(["Thank you"], ["thank you ", "I am cold", "i am cold", " ", "Water"]),
    ).toEqual(["I am cold", "Water"]);
  });
});

describe("topRows and topPhrases", () => {
  const rows = [
    row("Written one"),
    row("Starter", { kind: "starter", pinned: true }),
    row("Kept one", { pinned: true }),
    row("Written two"),
    row("Kept two", { pinned: true }),
  ];

  it("puts the pinned rows of a kind first, in their order, and caps them", () => {
    expect(topRows(rows, 3, "phrase").map((one) => one.text)).toEqual([
      "Kept one",
      "Kept two",
      "Written one",
    ]);
    expect(topRows(rows, 5, "starter").map((one) => one.text)).toEqual(["Starter"]);
  });

  it("gives the texts of the phrases without the starters", () => {
    expect(topPhrases(rows, 10)).toEqual(["Kept one", "Kept two", "Written one", "Written two"]);
  });
});

describe("isKept", () => {
  it("is true only for the text of a pinned row", () => {
    const rows = [row("Thank you", { pinned: true }), row("Water")];

    expect(isKept(" thank YOU", rows)).toBe(true);
    expect(isKept("Water", rows)).toBe(false);
  });
});

describe("pinnedPhrase", () => {
  it("makes a pinned phrase with a code that no row holds", () => {
    const made = pinnedPhrase("Thank you very much", "space", [row("Other", { code: "tyvm" })], 5);

    expect(made).toMatchObject({
      space_id: "space",
      text: "Thank you very much",
      kind: "phrase",
      pinned: true,
      created_at: 5,
      updated_at: 5,
    });
    expect(made?.code).toBeTruthy();
    expect(made?.code).not.toBe("tyvm");
  });

  it("makes nothing when the space holds the text already", () => {
    expect(pinnedPhrase("water ", "space", [row("Water")])).toBeNull();
  });
});
