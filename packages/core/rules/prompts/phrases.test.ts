import { describe, expect, it } from "vitest";

import { buildPhrasesPrompt } from "./phrases.ts";

describe("buildPhrasesPrompt with audio tags", () => {
  const input = { existing: [{ text: "[laughs] That is hilarious", pinned: true }], history: [] };

  it("has no tag rules by default", () => {
    expect(buildPhrasesPrompt(input).system).not.toContain("audio tag");
  });

  it("lets the model add a tag to a phrase with a clear feeling when tags are spoken", () => {
    const { system } = buildPhrasesPrompt({ ...input, tags: true });
    expect(system).toContain("<audio_tags>");
    expect(system.indexOf("<audio_tags>")).toBeLessThan(system.indexOf("Answer with JSON"));
  });
});
