import assert from "node:assert/strict";
import test from "node:test";

import { matchesWords, searchModels } from "../src/rules/pick.ts";

const MODELS = [
  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    name: "Qwen: Qwen3 Next 80B (free)",
    free: true,
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "OpenAI: gpt-oss 20B (free)",
    free: true,
  },
  { id: "openai/gpt-5", name: "OpenAI: GPT-5", free: false },
  {
    id: "anthropic/claude-opus-5",
    name: "Anthropic: Claude Opus 5",
    free: false,
  },
];

test("no words show the free models, because the user needs no card", () => {
  assert.deepEqual(
    searchModels(MODELS, "").map((model) => model.id),
    ["qwen/qwen3-next-80b-a3b-instruct:free", "openai/gpt-oss-20b:free"],
  );
  assert.deepEqual(searchModels(MODELS, "   "), searchModels(MODELS, ""));
});

test("a word searches every model, free and paid", () => {
  assert.deepEqual(
    searchModels(MODELS, "gpt").map((model) => model.id),
    ["openai/gpt-oss-20b:free", "openai/gpt-5"],
  );
  assert.deepEqual(
    searchModels(MODELS, "opus").map((model) => model.id),
    ["anthropic/claude-opus-5"],
  );
});

test("the words find a name or an id, in any letter case and any order", () => {
  assert.deepEqual(
    searchModels(MODELS, "ANTHROPIC").map((model) => model.id),
    ["anthropic/claude-opus-5"],
  );
  // Each word must match, so two words make the list shorter, not longer.
  assert.deepEqual(
    searchModels(MODELS, "5 opus").map((model) => model.id),
    ["anthropic/claude-opus-5"],
  );
  assert.deepEqual(searchModels(MODELS, "opus qwen"), []);
});

test("the chosen model stays, or the closed picker loses its name", () => {
  const kept = searchModels(MODELS, "qwen", "openai/gpt-5");

  assert.deepEqual(
    kept.map((model) => model.id),
    ["qwen/qwen3-next-80b-a3b-instruct:free", "openai/gpt-5"],
  );
  // A row the words already found is not a second row.
  assert.deepEqual(
    searchModels(MODELS, "qwen", "qwen/qwen3-next-80b-a3b-instruct:free")
      .length,
    1,
  );
});

test("the words find the Automatic row, in any letter case", () => {
  const label = "Automatic (free models)";

  assert.equal(matchesWords(label, ""), true);
  assert.equal(matchesWords(label, "   "), true);
  assert.equal(matchesWords(label, "automatic"), true);
  assert.equal(matchesWords(label, "AUTO"), true);
  assert.equal(matchesWords(label, "free models"), true);
  assert.equal(matchesWords(label, "gpt"), false);
});
