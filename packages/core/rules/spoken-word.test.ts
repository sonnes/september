import { describe, expect, it } from "vitest";

import { wordAt, wordsOf } from "./spoken-word";

describe("wordAt", () => {
  it("counts the words before a character of the spoken text", () => {
    const text = "Thursday is the physio appointment.";
    expect(wordAt(text, 0)).toBe(0);
    expect(wordAt(text, text.indexOf("physio"))).toBe(3);
    expect(wordAt(text, text.indexOf("appointment") + 4)).toBe(4);
  });

  it("treats a run of spaces as one break", () => {
    expect(wordAt("Not   too hot", 9)).toBe(2);
  });
});

describe("wordsOf", () => {
  it("keeps the spaces, so the parts join back into the text", () => {
    const parts = wordsOf("Sam is  driving.");
    expect(parts.map((part) => part.text).join("")).toBe("Sam is  driving.");
    expect(parts.filter((part) => part.word !== null).map((part) => part.word)).toEqual([0, 1, 2]);
  });
});
