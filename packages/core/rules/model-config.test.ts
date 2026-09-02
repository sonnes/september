import { describe, expect, it } from "vitest";

import {
  modelConfigFor,
  modelSettingsFrom,
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
