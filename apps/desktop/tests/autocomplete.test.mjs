import assert from "node:assert/strict";
import test from "node:test";

import {
  applySuggestion,
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
  assert.equal(applySuggestion("I want some wat", "water"), "I want some water ");
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
