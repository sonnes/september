/**
 * How many keystrokes the word tiles save on speech the engine never saw.
 *
 * September exists to get a user to a full sentence with fewer keystrokes, so
 * this is the measure that matters. The test holds a floor. A change to the
 * corpus or to the dictionary that lowers the saving fails the build.
 *
 * The two sets model the two things a user writes: a care request, and a line
 * of ordinary conversation. No line comes from `corpus.ts`.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  Autocomplete,
  createEngine,
  MAX_SUGGESTIONS,
  SEED_CORPUS,
  suggestionsFor,
} from "../src/autocomplete/index.ts";

const CARE = [
  "can you please raise the bed a little",
  "my throat is dry could i have a sip of water",
  "please turn me onto my left side",
  "i am too warm can you take off the blanket",
  "the mask is hurting my nose",
  "please suction me",
  "i would like to sit up for a while",
  "call my wife and tell her i am fine",
  "when is the doctor coming to see me",
  "i did not sleep well last night",
  "please put on the television",
  "can you turn down the lights",
  "my glasses have slipped please fix them",
  "i love you very much",
  "thank you for looking after me",
  "i am not in any pain right now",
  "please scratch my right cheek",
  "tell the nurse i need the bathroom",
  "i want to go outside for some fresh air",
  "please read me the letter that came today",
  "i am feeling low today",
  "can we listen to some music",
  "my feet are cold please cover them",
  "please move the chair closer so i can see you",
  "i need my medicine now",
  "the pillow is too flat",
  "please stay with me for a few minutes",
  "i am ready to go to bed",
  "who is coming to visit tomorrow",
  "i cannot hear you very well",
];

const SOCIAL = [
  "it was lovely to see you yesterday",
  "are the kids coming over this weekend",
  "i watched a good film last night",
  "tell your mother i was asking after her",
  "the garden looks nice from here",
  "i had a bad night but i am better now",
  "what did the doctor say about your knee",
  "i miss going out for a walk",
  "put the football on if it is still playing",
  "i am glad you came to see me today",
];

/**
 * The fraction of characters that the tiles save.
 *
 * The reader types the sentence one character at a time. Before each
 * character, the reader looks at the tiles. If a tile holds the word that
 * comes next, the reader takes it for one keystroke and goes on.
 */
function savingRate(engine, sentences) {
  let pressed = 0;
  let characters = 0;

  for (const sentence of sentences) {
    let written = "";
    let at = 0;
    characters += sentence.length;

    while (at < sentence.length) {
      const started =
        written === "" || /\s$/.test(written)
          ? ""
          : (written.match(/\S+$/)?.[0] ?? "");
      const wanted = (
        sentence.slice(at - started.length).match(/^\S+/) ?? [""]
      )[0];
      const tile = suggestionsFor(engine, written)
        .slice(0, MAX_SUGGESTIONS)
        .find(
          (word) =>
            word.toLowerCase() === wanted.toLowerCase() &&
            wanted.length > started.length,
        );

      if (tile) {
        pressed += 1;
        at += wanted.length - started.length;
        written = written.slice(0, written.length - started.length) + wanted + " ";
        if (sentence[at] === " ") at += 1;
        continue;
      }

      written += sentence[at];
      pressed += 1;
      at += 1;
    }
  }

  return 1 - pressed / characters;
}

/**
 * The floors. Measured on 2026-08-22: care 0.478, social 0.511.
 *
 * Raise a floor when a change raises the measurement. Never lower one without
 * a reason written in the commit.
 */
const FLOOR = { care: 0.45, social: 0.48 };

test("the tiles save keystrokes on a care request", () => {
  const rate = savingRate(createEngine(), CARE);

  assert.ok(
    rate >= FLOOR.care,
    `saving ${(rate * 100).toFixed(1)}%, floor ${FLOOR.care * 100}%`,
  );
});

test("the tiles save keystrokes on ordinary conversation", () => {
  const rate = savingRate(createEngine(), SOCIAL);

  assert.ok(
    rate >= FLOOR.social,
    `saving ${(rate * 100).toFixed(1)}%, floor ${FLOOR.social * 100}%`,
  );
});

test("the dictionary is what raises the saving", () => {
  const sentencesOnly = new Autocomplete();
  sentencesOnly.train(SEED_CORPUS);

  const before = savingRate(sentencesOnly, CARE);
  const after = savingRate(createEngine(), CARE);

  // The sentences alone saved 37.6% on 2026-08-22. The dictionary must add
  // at least 8 points, or it is not doing the job it was added for.
  assert.ok(
    after - before >= 0.08,
    `sentences ${(before * 100).toFixed(1)}%, with dictionary ${(after * 100).toFixed(1)}%`,
  );
});
