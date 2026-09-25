import { describe, expect, it } from "vitest";

import {
  DEFAULT_VOICE_MODEL,
  EXPRESSIONS,
  expressionOf,
  expressionSound,
  heardVoices,
  stabilityFor,
  voiceModelFrom,
  voiceRows,
} from "./voice.ts";

describe("voiceModelFrom", () => {
  it("reads the deprecated Turbo models as their Flash replacements", () => {
    expect(voiceModelFrom("eleven_turbo_v2_5")).toBe("eleven_flash_v2_5");
    expect(voiceModelFrom("eleven_turbo_v2")).toBe("eleven_flash_v2");
  });

  it("keeps every other model", () => {
    expect(voiceModelFrom("eleven_v3")).toBe("eleven_v3");
    expect(voiceModelFrom("eleven_multilingual_v2")).toBe(
      "eleven_multilingual_v2",
    );
  });

  it("uses Flash v2.5 by default", () => {
    expect(DEFAULT_VOICE_MODEL).toBe("eleven_flash_v2_5");
  });
});

describe("expression", () => {
  const MODELS = ["eleven_flash_v2_5", "eleven_multilingual_v2", "eleven_v3"];

  it.each(
    MODELS.flatMap((modelId) =>
      EXPRESSIONS.map((expression) => [modelId, expression.key] as const),
    ),
  )("reads the %s sound of the %s preset as that preset", (modelId, key) => {
    expect(expressionOf({ modelId, ...expressionSound(key, modelId) })).toBe(
      key,
    );
  });

  it("sets the same similarity for every preset", () => {
    const sounds = EXPRESSIONS.map(({ key }) => expressionSound(key));
    expect(new Set(sounds.map((sound) => sound.similarity))).toEqual(
      new Set([0.75]),
    );
  });

  it("gives steadier presets a higher stability on every model", () => {
    for (const modelId of MODELS) {
      const [steady, natural, expressive] = EXPRESSIONS.map(
        ({ key }) => expressionSound(key, modelId).stability,
      );
      expect(steady).toBeGreaterThan(natural);
      expect(natural).toBeGreaterThan(expressive);
    }
  });

  it("gives each preset a stability mode of Eleven v3", () => {
    expect(
      EXPRESSIONS.map(({ key }) => expressionSound(key, "eleven_v3").stability),
    ).toEqual([1, 0.5, 0]);
  });

  it("reads a sound that matches no preset as custom", () => {
    expect(
      expressionOf({
        modelId: DEFAULT_VOICE_MODEL,
        stability: 0.6,
        similarity: 0.75,
      }),
    ).toBe("custom");
  });
});

describe("stabilityFor", () => {
  it("snaps stability to the three Eleven v3 modes", () => {
    expect(stabilityFor("eleven_v3", 0.2)).toBe(0);
    expect(stabilityFor("eleven_v3", 0.4)).toBe(0.5);
    expect(stabilityFor("eleven_v3", 0.8)).toBe(1);
  });

  it("keeps stability for the other models", () => {
    expect(stabilityFor("eleven_flash_v2_5", 0.42)).toBe(0.42);
  });
});

describe("voiceRows", () => {
  const voice = (
    id: string,
    name: string,
    category: string | null = "premade",
    is_owner: boolean | null = false,
  ) => ({ id, name, category, is_owner });

  it("splits a name into the name and a description", () => {
    const [row] = voiceRows([voice("r", "Roger - Laid-Back, Casual, Resonant")], []);
    expect(row).toMatchObject({ id: "r", name: "Roger", detail: "Laid-Back, Casual, Resonant" });
  });

  it("splits a name at an en dash too", () => {
    const [row] = voiceRows([voice("s", "Sia – The Commercial Ad Voice", "professional")], []);
    expect(row).toMatchObject({ name: "Sia", detail: "The Commercial Ad Voice" });
  });

  it("keeps a name with no description whole", () => {
    const [row] = voiceRows([voice("a", "Ravi v2", "generated", true)], []);
    expect(row).toMatchObject({ name: "Ravi v2" });
    expect(row.detail).toBeUndefined();
  });

  it("groups the voices the user made, then heard lately, then the library, then ElevenLabs", () => {
    const rows = voiceRows(
      [
        voice("roger", "Roger - Casual"),
        voice("adam", "Adam - Firm"),
        voice("sia", "Sia - Calm", "professional"),
        voice("khushi", "Khushi - Clear", "professional"),
        voice("ravi", "Ravi", "cloned", true),
        voice("jo", "Jo v2", "generated", true),
        voice("bill", "Bill - Wise"),
      ],
      ["bill"],
    );
    expect(rows.map((row) => [row.id, row.group])).toEqual([
      ["jo", "Yours"],
      ["ravi", "Yours"],
      ["bill", "Heard lately"],
      ["khushi", "From the library"],
      ["sia", "From the library"],
      ["adam", "ElevenLabs voices"],
      ["roger", "ElevenLabs voices"],
    ]);
  });

  it("counts a cloned or generated voice as the user's when ElevenLabs does not say who owns it", () => {
    const rows = voiceRows(
      [voice("mine", "Mine", "cloned", null), voice("made", "Made", "generated", null)],
      [],
    );
    expect(rows.map((row) => row.group)).toEqual(["Yours", "Yours"]);
  });

  it("keeps the order in which the voices were heard", () => {
    const rows = voiceRows([voice("a", "A"), voice("b", "B")], ["b", "a"]);
    expect(rows.map((row) => row.id)).toEqual(["b", "a"]);
  });
});

describe("heardVoices", () => {
  it("puts the voice heard now first and keeps three", () => {
    expect(heardVoices(["a", "b", "c"], "d")).toEqual(["d", "a", "b"]);
    expect(heardVoices(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
  });
});
