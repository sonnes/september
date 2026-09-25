import { describe, expect, it } from "vitest";
import {
  composeSuggestions,
  historyMatches,
  joinTokens,
  stripeForText,
  takeTokens,
  tokenize,
} from "./stripes";

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

describe("audio tags in a row", () => {
  it("keeps a tag as one token", () => {
    expect(tokenize("[clears throat] Excuse me.")).toEqual([
      "[clears throat]",
      "Excuse",
      "me",
      ".",
    ]);
  });

  it("shows a tag before the typed words and puts it at the start of a take", () => {
    const row = stripeForText("[laughs] That is the funniest thing all week.", "That is ");
    expect(row.tokens.slice(row.hidden)).toEqual([
      "[laughs]", "the", "funniest", "thing", "all", "week", ".",
    ]);
    expect(row.hasMore).toBe(false);
    expect(joinTokens(takeTokens(row, row.hidden + 2))).toBe("[laughs] That is the ");
    expect(joinTokens(takeTokens(row, row.tokens.length))).toBe(
      "[laughs] That is the funniest thing all week. ",
    );
  });

  it("keeps a tag that the user already typed hidden", () => {
    const row = stripeForText("[laughs] That is funny.", "[laughs] That is ");
    expect(row.tokens.slice(row.hidden)).toEqual(["funny", "."]);
    expect(joinTokens(takeTokens(row, row.tokens.length))).toBe("[laughs] That is funny. ");
  });

  it("does not count a tag toward the six words of a slice", () => {
    const row = stripeForText("One [sighs] two three four five six seven.", "");
    expect(joinTokens(row.tokens)).toBe("One [sighs] two three four five six ");
    expect(row.hasMore).toBe(true);
  });

  it("keeps a tag after the last sentence in that sentence", () => {
    const row = stripeForText("That is funny. [giggles]", "That ");
    expect(row.tokens.slice(row.hidden)).toEqual(["is", "funny", ".", "[giggles]"]);
    expect(row.hasMore).toBe(false);
  });

  it("keeps the tags that the user typed when a row without them is taken", () => {
    const row = stripeForText("That is so funny.", "[laughs] That is ");
    expect(row.tokens.slice(row.hidden)).toEqual(["so", "funny", "."]);
    expect(joinTokens(takeTokens(row, row.hidden + 2))).toBe("[laughs] That is so funny ");

    const middle = stripeForText("That is so funny.", "That [sighs] is ");
    expect(joinTokens(takeTokens(middle, middle.tokens.length))).toBe(
      "That [sighs] is so funny. ",
    );

    const after = stripeForText("That is so funny.", "That is [laughs] ");
    expect(joinTokens(takeTokens(after, after.tokens.length))).toBe(
      "That is [laughs] so funny. ",
    );
  });

  it("replaces a half-typed word and keeps the tags before it", () => {
    const row = stripeForText("That is so funny.", "[laughs] That is so fu");
    expect(row.tokens.slice(row.hidden)).toEqual(["funny", "."]);
    expect(joinTokens(takeTokens(row, row.hidden + 1))).toBe("[laughs] That is so funny ");
  });

  it("matches past messages and phrases through their tags", () => {
    expect(historyMatches("That is", ["[laughs] That is funny."])).toEqual([
      "[laughs] That is funny.",
    ]);
    expect(
      composeSuggestions({ typed: "I am", history: [], mdPhrases: ["[sighs] I am tired."], llm: [] }),
    ).toEqual([{ text: "[sighs] I am tired.", source: "md" }]);
  });
});
