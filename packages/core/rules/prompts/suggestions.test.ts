import { describe, expect, it } from "vitest";

import { exampleTags, moodBlock } from "../moods.ts";
import { buildSuggestionPrompt } from "./suggestions.ts";

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

  it("adds the tag rules with the examples of the mood when tags are spoken", () => {
    for (const mood of [null, "angry"] as const) {
      const { system } = buildSuggestionPrompt({ ...base, mood, tags: true });
      expect(system).toContain("<audio_tags>");
      for (const tag of exampleTags(mood)) expect(system).toContain(tag);
    }
  });

  it("adds the same parts to the opening prompt", () => {
    const { system } = buildSuggestionPrompt({ ...base, typed: "", mood: "low", tags: true });
    expect(system).toContain(moodBlock("low"));
    expect(system).toContain("<audio_tags>");
  });
});

describe("buildSuggestionPrompt for a short draft", () => {
  const system = (typed: string) => buildSuggestionPrompt({ ...base, typed }).system;

  it("gives one or two words the search prompt, and a longer draft the completion prompt", () => {
    expect(system("water ")).toBe(system("glass of "));
    expect(system("water ")).not.toBe(system("I want to go "));
    expect(system("That is so ")).toBe(system("I want to go "));
    expect(system("water ")).not.toBe(system(""));
  });

  it("does not count a tag as a word", () => {
    expect(system("[sighs] water ")).toBe(system("water "));
  });
});

describe("buildSuggestionPrompt for a note", () => {
  const note = { before: "# Day\nRead for 20 minutes before you ", after: "\n> Show me." };

  it("sends the full note with a caret mark in place of the conversation", () => {
    const { user } = buildSuggestionPrompt({ ...base, typed: "before you ", document: note });
    expect(user).toContain('Current input: "before you "');
    expect(user).toContain("# Day\nRead for 20 minutes before you <caret/>\n> Show me.");
    expect(user).not.toContain("Me: Hello");
  });

  it("tells the model that the words continue the note at the caret", () => {
    const { system } = buildSuggestionPrompt({ ...base, document: note });
    expect(system).toContain("<caret/>");
    expect(buildSuggestionPrompt(base).system).not.toContain("<caret/>");
  });
});
