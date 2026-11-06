import { describe, expect, it } from "vitest";

import { matchesWords } from "./pick.ts";

describe("matchesWords", () => {
  it("matches every word in any letter case, and matches all text for no words", () => {
    const label = "Automatic (free models)";
    expect(matchesWords(label, "")).toBe(true);
    expect(matchesWords(label, "AUTO")).toBe(true);
    expect(matchesWords(label, "free models")).toBe(true);
    expect(matchesWords(label, "gpt")).toBe(false);
  });
});
