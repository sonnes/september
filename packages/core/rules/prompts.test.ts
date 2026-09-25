import { describe, expect, it } from "vitest";

import { buildSuggestionPrompt } from "./prompts.ts";

const base = { globalMd: "", spaceMd: "", history: ["Me: Hello"], typed: "That is " };

describe("buildSuggestionPrompt with a mood and audio tags", () => {
  it("has no mood block and no tag rules by default", () => {
    const { system } = buildSuggestionPrompt(base);
    expect(system).not.toContain("<mood>");
    expect(system).not.toContain("square brackets");
  });

  it("puts the mood block in the user context", () => {
    const { system } = buildSuggestionPrompt({ ...base, mood: "playful" });
    expect(system).toMatch(
      /<user_context>\n<mood>\nThe user feels playful\.[\s\S]*<\/mood>\n<\/user_context>/,
    );
    expect(system).not.toContain("square brackets");
  });

  it("puts the mood block after the speaking style", () => {
    const { system } = buildSuggestionPrompt({
      ...base,
      globalMd: "Speak plainly.",
      mood: "warm",
    });
    expect(system.indexOf("Speak plainly.")).toBeLessThan(system.indexOf("<mood>"));
  });

  it("adds the tag rules with the default examples when tags are spoken", () => {
    const { system } = buildSuggestionPrompt({ ...base, tags: true });
    expect(system).toContain("You can add audio tags in square brackets");
    expect(system).toContain("Example tags: laughs, sighs, whispers, excited, curious.");
  });

  it("uses the examples of the mood when tags are spoken", () => {
    const { system } = buildSuggestionPrompt({ ...base, mood: "angry", tags: true });
    expect(system).toContain("Example tags: angry, shouting, firmly.");
  });

  it("adds the same parts to the opening prompt", () => {
    const { system } = buildSuggestionPrompt({ ...base, typed: "", mood: "low", tags: true });
    expect(system).toContain("The user feels low or tired.");
    expect(system).toContain("Example tags: sighs, sad, exhales.");
  });
});
