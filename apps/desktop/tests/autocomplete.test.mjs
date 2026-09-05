import assert from "node:assert/strict";
import test from "node:test";

import {
  applySuggestion,
  Autocomplete,
  createEngine,
  suggestionsFor,
} from "../src/autocomplete/index.ts";

test("a new engine knows the seed words", () => {
  const engine = createEngine();

  assert.equal(engine.isReady(), true);
  assert.ok(suggestionsFor(engine, "I would like some wat").includes("water"));
});

test("a part of a word gets the spellings of that word", () => {
  const words = suggestionsFor(createEngine(), "cof");

  assert.ok(words.length > 0);
  assert.ok(words.every((word) => word.startsWith("cof")));
});

test("a finished word gets the words that come next", () => {
  const words = suggestionsFor(createEngine(), "I would like ");

  assert.ok(words.length > 0);
  assert.ok(!words.includes("<s>"));
});

test("no text gets no words", () => {
  const engine = createEngine();

  assert.deepEqual(suggestionsFor(engine, ""), []);
  assert.deepEqual(suggestionsFor(engine, "   "), []);
});

test("a chosen spelling replaces the part of the word", () => {
  assert.equal(
    applySuggestion("I want some wat", "water"),
    "I want some water ",
  );
});

test("a chosen next word goes after the text", () => {
  assert.equal(applySuggestion("I want some ", "water"), "I want some water ");
});

test("the words of a space come back in that space", () => {
  const engine = createEngine();
  for (let i = 0; i < 40; i += 1) {
    engine.observe("please pass the stethoscope", { chatId: "clinic" });
  }

  const inClinic = suggestionsFor(engine, "please pass the ", "clinic");

  assert.ok(inClinic.includes("stethoscope"));
});

test("a dictionary word is offered even when the seed corpus never uses it", () => {
  const engine = createEngine();

  assert.ok(suggestionsFor(engine, "she was hon").includes("honest"));
});

test("the dictionary ranks a common word over a rare one", () => {
  const words = createEngine()
    .getCompletionsAdvanced("su", { maxResults: 200 })
    .map((one) => one.word);

  assert.ok(words.includes("sure"));
  assert.ok(words.includes("suspect"));
  assert.ok(words.indexOf("sure") < words.indexOf("suspect"));
});

test("the dictionary does not predict a next word by itself", () => {
  const plain = new Autocomplete();
  plain.train("one two three.");
  const before = plain.getNextWord("one");

  plain.seedDictionary(["alpha", "beta", "gamma"]);

  assert.deepEqual(plain.getNextWord("one"), before);
  assert.ok(plain.getCompletions("al").includes("alpha"));
});

test("the dictionary keeps the order it was given", () => {
  const plain = new Autocomplete();
  plain.train("nothing here.");
  plain.seedDictionary(["banana", "band", "bandage"]);

  assert.deepEqual(plain.getCompletions("ban").slice(0, 3), [
    "banana",
    "band",
    "bandage",
  ]);
});
