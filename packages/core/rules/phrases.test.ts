import { describe, expect, it } from "vitest";

import { buildPhrasesPrompt, generateCode } from "./phrases.ts";

describe("generateCode with audio tags", () => {
  it("reads the words only, so a tag does not change the code", () => {
    const plain = generateCode("Excuse me, I have something to say", { existingCodes: [] });
    expect(
      generateCode("[clears throat] Excuse me, I have something to say", { existingCodes: [] }),
    ).toBe(plain);
  });
});

describe("buildPhrasesPrompt with audio tags", () => {
  const input = { existing: [{ text: "[laughs] That is hilarious", pinned: true }], history: [] };

  it("has no tag rules by default", () => {
    expect(buildPhrasesPrompt(input).system).not.toContain("audio tag");
  });

  it("lets the model add a tag to a phrase with a clear feeling when tags are spoken", () => {
    const { system } = buildPhrasesPrompt({ ...input, tags: true });
    expect(system).toContain("audio tag");
    expect(system).toContain("[pinned] is a marker of the app, not an audio tag");
  });
});
