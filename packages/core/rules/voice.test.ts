import { describe, expect, it } from "vitest";

import {
  cloudSound,
  DEFAULT_SPEECH,
  DEFAULT_VOICE_MODEL,
  DIALOGUE_MODELS,
  dialogueModelFrom,
  dialogueParts,
  elevenLabsCredits,
  expressionOf,
  EXPRESSIONS,
  expressionSound,
  heardVoices,
  speechServices,
  stabilityFor,
  VOICE_MODELS,
  voiceList,
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

  it("snaps stability for Eleven v3 Conversational too", () => {
    expect(stabilityFor("eleven_v3_conversational", 0.62)).toBe(0.5);
  });

  it("keeps stability for the other models", () => {
    expect(stabilityFor("eleven_flash_v2_5", 0.42)).toBe(0.42);
  });
});

describe("cloudSound", () => {
  const dialogue = {
    ...DEFAULT_SPEECH,
    provider: "dialogue" as const,
    dialogueModelId: "eleven_v3_conversational",
    stability: 0.62,
    speed: 0.8,
  };

  it("speaks the Dialogue voice live with its chosen model, a stability mode, and no speed", () => {
    expect(cloudSound(dialogue, "live")).toEqual({
      modelId: "eleven_v3_conversational",
      stability: 0.5,
      similarity: 0.75,
      speed: 1,
    });
  });

  it("makes a Dialogue file with Eleven v3 and the same stability mode", () => {
    expect(cloudSound(dialogue, "file")).toEqual({
      modelId: "eleven_v3",
      stability: 0.5,
      similarity: 0.75,
      speed: 1,
    });
  });

  it("keeps the model and the values of an ElevenLabs voice", () => {
    const voice = { ...DEFAULT_SPEECH, provider: "elevenlabs" as const, stability: 0.42, speed: 1.1 };
    expect(cloudSound(voice, "file")).toEqual({
      modelId: DEFAULT_VOICE_MODEL,
      stability: 0.42,
      similarity: 0.75,
      speed: 1.1,
    });
  });
});

describe("speechServices", () => {
  it("offers each service once, with the system voice of the platform", () => {
    const services = speechServices("Built into this device.");
    expect(services.map((one) => one.value)).toEqual(["system", "elevenlabs", "dialogue"]);
    expect(services[0].description).toBe("Built into this device.");
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

describe("dialogueParts", () => {
  it("keeps a short text as one part", () => {
    expect(dialogueParts("Hello there. How are you?")).toEqual([
      "Hello there. How are you?",
    ]);
  });

  it("cuts a long text at sentence ends", () => {
    const text = "One two three. Four five six. Seven eight nine.";
    expect(dialogueParts(text, 30)).toEqual([
      "One two three. Four five six.",
      "Seven eight nine.",
    ]);
  });

  it("cuts a sentence longer than the limit at the last space", () => {
    expect(dialogueParts("alpha beta gamma delta", 12)).toEqual([
      "alpha beta",
      "gamma delta",
    ]);
  });

  it("never gives a part longer than the limit", () => {
    const text = `${"word ".repeat(900)}end. ${"more ".repeat(300)}`;
    const parts = dialogueParts(text);
    expect(parts.every((part) => part.length <= 2000)).toBe(true);
    expect(parts.join(" ").split(/\s+/)).toEqual(text.trim().split(/\s+/));
  });

  it("keeps punctuation at the start of a text", () => {
    expect(dialogueParts("...I guess so")).toEqual(["...I guess so"]);
    expect(dialogueParts("?!")).toEqual(["?!"]);
  });

  it("keeps decimals and web addresses whole", () => {
    const text = "It costs 3.50 today. Visit example.com now";
    expect(dialogueParts(text)).toEqual([text]);
    expect(dialogueParts(text, 25)).toEqual(["It costs 3.50 today.", "Visit example.com now"]);
  });

  it("gives nothing for empty text", () => {
    expect(dialogueParts("   ")).toEqual([]);
  });

});

describe("dialogueModelFrom", () => {
  it("keeps a Dialogue model", () => {
    expect(dialogueModelFrom("eleven_v3_conversational")).toBe("eleven_v3_conversational");
  });

  it("reads a missing or other model as Eleven v3", () => {
    expect(dialogueModelFrom(undefined)).toBe("eleven_v3");
    expect(dialogueModelFrom("eleven_flash_v2_5")).toBe("eleven_v3");
  });
});

describe("elevenLabsCredits", () => {
  it("turns the rate of the model into whole credits", () => {
    expect(elevenLabsCredits("abc", "eleven_flash_v2_5")).toBe(2);
    expect(elevenLabsCredits("abc", "eleven_v3")).toBe(3);
    expect(elevenLabsCredits("abc", "unlisted")).toBeUndefined();
  });

  it("reads a deprecated model at the rate of its replacement", () => {
    expect(elevenLabsCredits("abc", "eleven_turbo_v2_5")).toBe(2);
    expect(elevenLabsCredits("abc", "eleven_turbo_v2")).toBe(2);
  });

  it("knows the rate of every model the apps offer", () => {
    for (const model of [...VOICE_MODELS, ...DIALOGUE_MODELS]) {
      expect(elevenLabsCredits("abc", model.id)).toBeGreaterThan(0);
    }
  });
});

describe("voiceList", () => {
  const voice = (id: string, name: string, category: string | null) => ({ id, name, category });
  const own = [voice("mine", "Maya clone", "cloned"), voice("lib", "Rachel library", "professional")];
  const stock = [voice("adam", "Adam - deep", "premade"), voice("rachel", "Rachel - calm", "premade")];
  const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

  it("hides the stock voices of an account with its own voices", () => {
    expect(ids(voiceList([...own, ...stock], [], ""))).toEqual(["mine", "lib"]);
  });

  it("adds the stock voices that match a search", () => {
    expect(ids(voiceList([...own, ...stock], [], "rachel"))).toEqual(["lib", "rachel"]);
  });

  it("shows the stock voices of an account with no voices of its own", () => {
    expect(ids(voiceList(stock, [], ""))).toEqual(["adam", "rachel"]);
    expect(ids(voiceList(stock, [], "adam"))).toEqual(["adam"]);
  });

  it("keeps the chosen voice", () => {
    expect(ids(voiceList([...own, ...stock], [], "", "adam"))).toEqual(["mine", "lib", "adam"]);
  });

  it("shows each voice once and drops a voice with no id", () => {
    const rows = voiceList([voice("a", "A", null), voice("", "B", null), voice("a", "A", null)], [], "");
    expect(ids(rows)).toEqual(["a"]);
  });
});
