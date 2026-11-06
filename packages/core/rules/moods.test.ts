import { describe, expect, it } from "vitest";

import { exampleTags, moodBlock, moodFrom, MOODS } from "./moods.ts";

describe("MOODS", () => {
  it("gives each mood its own key, an emoji, instructions, and example tags", () => {
    expect(new Set(MOODS.map((mood) => mood.key)).size).toBe(MOODS.length);
    for (const mood of MOODS) {
      expect(mood.emoji).not.toBe("");
      expect(mood.lines.length).toBeGreaterThan(0);
      expect(mood.tags.length).toBeGreaterThan(0);
    }
  });
});

describe("moodFrom", () => {
  it("reads a saved mood", () => {
    for (const mood of MOODS) expect(moodFrom(mood.key)).toBe(mood.key);
  });

  it("reads anything else as no mood", () => {
    expect(moodFrom("hushed")).toBeNull();
    expect(moodFrom(null)).toBeNull();
    expect(moodFrom(3)).toBeNull();
  });
});

describe("moodBlock", () => {
  it("puts every instruction of the mood inside one mood block", () => {
    for (const mood of MOODS) {
      const block = moodBlock(mood.key);
      expect(block.startsWith("<mood>\n")).toBe(true);
      expect(block.endsWith("\n</mood>")).toBe(true);
      for (const line of mood.lines) expect(block).toContain(line);
    }
  });

  it("gives nothing without a mood", () => {
    expect(moodBlock(null)).toBe("");
  });
});

describe("exampleTags", () => {
  it("gives the tags of the mood", () => {
    for (const mood of MOODS) expect(exampleTags(mood.key)).toEqual(mood.tags);
  });

  it("gives example tags without a mood", () => {
    expect(exampleTags(null).length).toBeGreaterThan(0);
  });
});
