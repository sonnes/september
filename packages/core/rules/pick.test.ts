import { describe, expect, it } from "vitest";

import { matchesWords, searchModels } from "./pick.ts";

const MODELS = [
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", name: "Qwen: Qwen3 Next 80B (free)", free: true },
  { id: "openai/gpt-oss-20b:free", name: "OpenAI: gpt-oss 20B (free)", free: true },
  { id: "openai/gpt-5", name: "OpenAI: GPT-5", free: false },
  { id: "anthropic/claude-opus-5", name: "Anthropic: Claude Opus 5", free: false },
];

const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

describe("searchModels", () => {
  it("shows only the free models when there are no words", () => {
    expect(ids(searchModels(MODELS, ""))).toEqual([
      "qwen/qwen3-next-80b-a3b-instruct:free",
      "openai/gpt-oss-20b:free",
    ]);
    expect(searchModels(MODELS, "   ")).toEqual(searchModels(MODELS, ""));
  });

  it("searches every model, free and paid", () => {
    expect(ids(searchModels(MODELS, "gpt"))).toEqual(["openai/gpt-oss-20b:free", "openai/gpt-5"]);
  });

  it("finds a name or an id in any letter case, and needs every word", () => {
    expect(ids(searchModels(MODELS, "ANTHROPIC"))).toEqual(["anthropic/claude-opus-5"]);
    expect(ids(searchModels(MODELS, "5 opus"))).toEqual(["anthropic/claude-opus-5"]);
    expect(searchModels(MODELS, "opus qwen")).toEqual([]);
  });

  it("keeps the chosen model once, even when the words leave it out", () => {
    expect(ids(searchModels(MODELS, "qwen", "openai/gpt-5"))).toEqual([
      "qwen/qwen3-next-80b-a3b-instruct:free",
      "openai/gpt-5",
    ]);
    expect(searchModels(MODELS, "qwen", "qwen/qwen3-next-80b-a3b-instruct:free")).toHaveLength(1);
  });
});

describe("matchesWords", () => {
  it("matches every word in any letter case, and matches all text for no words", () => {
    const label = "Automatic (free models)";
    expect(matchesWords(label, "")).toBe(true);
    expect(matchesWords(label, "AUTO")).toBe(true);
    expect(matchesWords(label, "free models")).toBe(true);
    expect(matchesWords(label, "gpt")).toBe(false);
  });
});
