import { describe, expect, it } from "vitest";

import { exampleTags, moodBlock, moodFrom, MOODS } from "./moods.ts";

describe("MOODS", () => {
  it("holds five moods, each with an emoji and example tags", () => {
    expect(MOODS.map((mood) => mood.key)).toEqual([
      "warm",
      "playful",
      "low",
      "frustrated",
      "angry",
    ]);
    for (const mood of MOODS) {
      expect(mood.emoji).not.toBe("");
      expect(mood.tags.length).toBeGreaterThan(0);
    }
  });
});

describe("moodFrom", () => {
  it("reads a saved mood", () => {
    expect(moodFrom("playful")).toBe("playful");
  });

  it("reads anything else as no mood", () => {
    expect(moodFrom("hushed")).toBeNull();
    expect(moodFrom(null)).toBeNull();
    expect(moodFrom(3)).toBeNull();
  });
});

describe("moodBlock", () => {
  it("gives the instructions of the mood in a mood block", () => {
    expect(moodBlock("low")).toBe(
      "<mood>\nThe user feels low or tired.\nWrite short, quiet suggestions.\nDo not try to change the mood of the user.\n</mood>",
    );
  });

  it("gives nothing without a mood", () => {
    expect(moodBlock(null)).toBe("");
  });
});

describe("exampleTags", () => {
  it("gives the tags of the mood", () => {
    expect(exampleTags("angry")).toEqual(["angry", "shouting", "firmly"]);
  });

  it("gives the default tags without a mood", () => {
    expect(exampleTags(null)).toEqual([
      "laughs",
      "sighs",
      "whispers",
      "excited",
      "curious",
    ]);
  });
});
