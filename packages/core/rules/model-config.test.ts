import { describe, expect, it } from "vitest";

import {
  AGENT_MODELS,
  modelChoices,
  modelConfigFor,
  modelSettingsFrom,
  SUGGESTIONS_MODELS,
  type ModelSettings,
} from "./model-config.ts";

const settings = (): ModelSettings => ({
  defaultModel: { service: "apple", model: "" },
  suggestionsModel: { service: "openrouter", model: "suggestions/fast" },
});

describe("model configuration", () => {
  it.each(["agent", "context", "phrases"])(
    "uses the default model for %s calls",
    (feature) => {
      expect(modelConfigFor(settings(), feature)).toEqual({
        service: "apple",
        model: "",
      });
    },
  );

  it("uses the Suggestions override for suggestion calls", () => {
    expect(modelConfigFor(settings(), "suggestions")).toEqual({
      service: "openrouter",
      model: "suggestions/fast",
    });
  });

  it("falls back to the default model when Suggestions has no override", () => {
    expect(
      modelConfigFor({ ...settings(), suggestionsModel: null }, "suggestions"),
    ).toEqual({ service: "apple", model: "" });
  });
});

describe("a setup written in an older shape", () => {
  it("reads the flat service and model it used to hold", () => {
    // The screens that read `defaultModel` threw on a row written before it
    // existed, and nothing normalised the setup on the way in.
    expect(
      modelSettingsFrom({ writingService: "openrouter", writingModel: "x/y" }),
    ).toEqual({
      defaultModel: { service: "openrouter", model: "x/y" },
      suggestionsModel: null,
    });
  });

  it("leaves a setup that already holds model settings alone", () => {
    const settings = {
      defaultModel: { service: "apple", model: "" },
      suggestionsModel: { service: "openrouter", model: "x/y" },
    };

    expect(modelSettingsFrom(settings)).toEqual(settings);
  });

  it("gives a row with neither shape a service that always works", () => {
    for (const row of [null, undefined, {}, { writingService: 7 }]) {
      expect(modelSettingsFrom(row)).toEqual({
        defaultModel: { service: "none", model: "" },
        suggestionsModel: null,
      });
    }
  });
});

describe("modelChoices", () => {
  it.each([
    ["suggestions", SUGGESTIONS_MODELS],
    ["agent", AGENT_MODELS],
  ] as const)("starts the %s list with Automatic", (_, list) => {
    expect(modelChoices(list, "")[0]).toMatchObject({ id: "", name: "Automatic" });
  });

  it.each([
    ["suggestions", SUGGESTIONS_MODELS],
    ["agent", AGENT_MODELS],
  ] as const)(
    "keeps the %s list short enough to need no search field",
    (_, list) => {
      expect(modelChoices(list, "").length).toBeLessThanOrEqual(8);
    },
  );

  it.each([
    ["suggestions", SUGGESTIONS_MODELS],
    ["agent", AGENT_MODELS],
  ] as const)("puts the frontier models before the open models in %s", (_, list) => {
    const groups = modelChoices(list, "")
      .slice(1)
      .map((row) => row.group);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups).toEqual([...groups].sort((a, b) =>
      a === b ? 0 : a === "Frontier" ? -1 : 1,
    ));
    expect(new Set(groups)).toEqual(new Set(["Frontier", "Open models"]));
  });

  it("adds a saved model that is not in the list as the first row", () => {
    const rows = modelChoices(SUGGESTIONS_MODELS, "vendor/old-model");
    expect(rows[0]).toMatchObject({
      id: "vendor/old-model",
      name: "Current: vendor/old-model",
    });
    expect(rows[1]).toMatchObject({ id: "", name: "Automatic" });
  });

  it("adds no extra row for a saved model in the list", () => {
    const saved = SUGGESTIONS_MODELS[0].id;
    expect(modelChoices(SUGGESTIONS_MODELS, saved)).toHaveLength(
      modelChoices(SUGGESTIONS_MODELS, "").length,
    );
  });
});
