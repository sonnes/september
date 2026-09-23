import { describe, expect, it } from "vitest";
import { composeSuggestions, historyMatches, joinTokens, stripeForText } from "./stripes";

describe("history sentences", () => {
  it("matches later sentences and keeps recent distinct sentences first", () => {
    expect(historyMatches("I need", [
      "I need water. I need rest.",
      "Hello! I need rest. I need help!",
    ])).toEqual(["I need rest.", "I need help!", "I need water."]);
  });

  it("retains decimals, punctuation, and an unfinished final sentence", () => {
    expect(historyMatches("It", ["Ready? It costs 3.50 today. It feels fine"])).toEqual([
      "It costs 3.50 today.", "It feels fine",
    ]);
    expect(historyMatches("", ["Hello there."])).toEqual([]);
    expect(historyMatches("hello there.", ["Hello there."])).toEqual([]);
  });

  it("deduplicates a history sentence against other sources", () => {
    expect(composeSuggestions({ typed: "Hello", history: ["Ready. Hello there."], mdPhrases: ["Hello there."], llm: [] }))
      .toEqual([{ text: "Hello there.", source: "history" }]);
  });
});

describe("suggestion slices", () => {
  const sentence = "One two, three four five six seven eight nine.";

  it("limits each slice to six words without counting punctuation", () => {
    const first = stripeForText(sentence, "");
    expect(joinTokens(first.tokens)).toBe("One two, three four five six ");
    expect(first.hasMore).toBe(true);
    const next = stripeForText(sentence, joinTokens(first.tokens));
    expect(joinTokens(next.tokens.slice(next.hidden))).toBe("seven eight nine. ");
    expect(joinTokens(next.tokens)).toBe(sentence + " ");
    expect(next.hasMore).toBe(false);
  });

  it("counts a partial word and advances after partial selection", () => {
    const row = stripeForText(sentence, "One tw");
    expect(joinTokens(row.tokens.slice(row.hidden))).toBe("two, three four five six seven ");
    const next = stripeForText(sentence, "One two, three ");
    expect(joinTokens(next.tokens.slice(next.hidden))).toBe("four five six seven eight nine. ");
    expect(next.hasMore).toBe(false);
  });

  it("ends a slice at the sentence boundary", () => {
    const row = stripeForText("Hello there! Please bring water.", "Hello ");
    expect(joinTokens(row.tokens)).toBe("Hello there! ");
    expect(row.hasMore).toBe(true);
    const next = stripeForText(row.text, joinTokens(row.tokens));
    expect(joinTokens(next.tokens.slice(next.hidden))).toBe("Please bring water. ");
    expect(next.hasMore).toBe(false);
  });
});
