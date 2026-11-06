import { describe, expect, it } from "vitest";

import { Autocomplete } from "./autocomplete.ts";

const CORPUS =
  "the cat sat on the mat. the dog ran in the park. the cat sat on the couch. " +
  "i will be there soon. i will be back. i love you. i love machine learning. " +
  "machine learning is cool. machine learning is hard. machine learning is fun.";

describe("Autocomplete completions", () => {
  it("offers the known words that start with the prefix, in any letter case", () => {
    const engine = new Autocomplete(CORPUS);

    expect(engine.completions("Mach", 10)).toEqual(["machine"]);
    expect(engine.completions("", 10)).toEqual([]);
  });

  it("offers a word as soon as the user writes it", () => {
    const engine = new Autocomplete(CORPUS);
    engine.observe("a brand new word oomph.");

    expect(engine.completions("oom", 10)).toContain("oomph");
  });

  it("ranks dictionary words in the order of the list", () => {
    const engine = new Autocomplete("nothing here.", ["banana", "band", "bandage"]);

    expect(engine.completions("ban", 3)).toEqual(["banana", "band", "bandage"]);
  });
});

describe("Autocomplete next words", () => {
  it("prefers the word that follows the longest known context", () => {
    const engine = new Autocomplete(
      "the cat sat. the cat sat. the cat sat. the cat ran. a cat ran. a cat ran. a cat ran. a cat ran.",
    );

    expect(engine.nextWords("the cat", 2)).toEqual(["sat", "ran"]);
  });

  it("backs off to shorter context when the full context is new", () => {
    const engine = new Autocomplete("the cat sat.");

    expect(engine.nextWords("a big fat cat", 1)).toEqual(["sat"]);
  });

  it("never offers a sentence mark", () => {
    const engine = new Autocomplete("hi. hi. hi.");

    expect(engine.nextWords("hi", 5)).not.toContain("</s>");
  });

  it("learns what the user says over the seed sentences", () => {
    const engine = new Autocomplete("hello there. hello there.");
    expect(engine.nextWords("hello", 1)).toEqual(["there"]);

    for (let i = 0; i < 10; i++) engine.observe("hello friend!");

    expect(engine.nextWords("hello", 1)).toEqual(["friend"]);
  });

  it("keeps what the user says in a space to that space", () => {
    const engine = new Autocomplete("see you at the meeting. see you at the meeting.");
    for (let i = 0; i < 20; i++) engine.observe("see you at the pool", "A");
    for (let i = 0; i < 20; i++) engine.observe("see you at the gym", "B");

    expect(engine.nextWords("see you at the", 1, "A")).toEqual(["pool"]);
    expect(engine.nextWords("see you at the", 1, "B")).toEqual(["gym"]);
  });

  it("does not predict pairs of words from the dictionary", () => {
    const without = new Autocomplete("one two three.");
    const withWords = new Autocomplete("one two three.", ["one", "alpha", "beta"]);

    expect(withWords.nextWords("one", 5)).toEqual(without.nextWords("one", 5));
  });
});
