import { describe, expect, it } from "vitest";

import {
  canReach,
  DEFAULT_DRAFT,
  defaultServices,
  isSetupDone,
  nextStep,
  previousStep,
  type SavedSetup,
  savedSetupFrom,
  setupVoices,
  speechFromOlderSetup,
  stepIndex,
} from "./onboarding.ts";

describe("the setup steps", () => {
  it("moves forward and back through the steps", () => {
    expect(nextStep("/welcome")).toBe("/choose");
    expect(nextStep("/choose")).toBe("/profile");
    expect(nextStep("/profile")).toBe("/connect");
    expect(nextStep("/connect")).toBe("/finish");
    expect(nextStep("/finish")).toBeNull();
    expect(previousStep("/welcome")).toBeNull();
    expect(previousStep("/profile")).toBe("/choose");
    expect(previousStep("/finish")).toBe("/connect");
  });

  it("gives no place to a path that is not a step", () => {
    expect(stepIndex("/connect")).toBe(3);
    expect(stepIndex("/spaces")).toBe(-1);
  });

  it("unlocks the steps after About you only with a name", () => {
    const blank = { name: "  " };
    expect(canReach("/welcome", blank)).toBe(true);
    expect(canReach("/choose", blank)).toBe(true);
    expect(canReach("/profile", blank)).toBe(true);
    expect(canReach("/connect", blank)).toBe(false);
    expect(canReach("/finish", blank)).toBe(false);
    expect(canReach("/connect", { name: "Ravi" })).toBe(true);
    expect(canReach("/finish", { name: "Ravi" })).toBe(true);
  });
});

describe("a finished setup", () => {
  it("needs a name and a mode", () => {
    expect(isSetupDone(null)).toBe(false);
    expect(isSetupDone({ name: "  ", mode: "free" })).toBe(false);
    expect(isSetupDone({ name: "Ravi", mode: null } as never)).toBe(false);
    expect(isSetupDone({ name: "Ravi", mode: "free" })).toBe(true);
    expect(isSetupDone({ name: "Ravi", mode: "advanced" })).toBe(true);
  });
});

describe("a saved setup", () => {
  it("is nothing when nothing is saved", () => {
    expect(savedSetupFrom(null)).toBeNull();
  });

  it("turns the features on that an older setup never answered", () => {
    const older = { ...DEFAULT_DRAFT, id: "ravi", name: "Ravi" } as Partial<SavedSetup>;
    delete older.autoSuggestions;
    delete older.autoPhrases;
    delete older.agentEnabled;
    const read = savedSetupFrom(older as SavedSetup)!;
    expect(read.autoSuggestions).toBe(true);
    expect(read.autoPhrases).toBe(true);
    expect(read.agentEnabled).toBe(true);
    expect(read.id).toBe("ravi");
  });

  it("drops the voice service of an older setup, which the speech settings hold", () => {
    const older = { ...DEFAULT_DRAFT, id: "ravi", name: "Ravi" } as unknown as SavedSetup;
    expect(savedSetupFrom(older)).not.toHaveProperty("voiceService");
  });

  it("keeps a feature the user turned off", () => {
    const saved = { ...DEFAULT_DRAFT, id: "ravi", name: "Ravi", autoPhrases: false };
    expect(savedSetupFrom(saved)!.autoPhrases).toBe(false);
  });
});

describe("defaultServices", () => {
  const none = { appleAvailable: false, openrouterConnected: false, elevenlabsConnected: false };

  it("chooses Apple Intelligence, then a connected OpenRouter", () => {
    expect(defaultServices(DEFAULT_DRAFT, { ...none, appleAvailable: true }).defaultModel.service).toBe("apple");
    expect(defaultServices(DEFAULT_DRAFT, { ...none, openrouterConnected: true }).defaultModel.service).toBe("openrouter");
    expect(defaultServices(DEFAULT_DRAFT, none).defaultModel.service).toBe("none");
  });

  it("keeps a service the person chose", () => {
    const chosen = { ...DEFAULT_DRAFT, defaultModel: { ...DEFAULT_DRAFT.defaultModel, service: "openrouter" as const } };
    expect(defaultServices(chosen, { ...none, appleAvailable: true }).defaultModel.service).toBe("openrouter");
  });

  it("speaks with ElevenLabs once it is connected", () => {
    expect(defaultServices(DEFAULT_DRAFT, { ...none, elevenlabsConnected: true }).voiceService).toBe("elevenlabs");
  });
});

describe("the voice of setup", () => {
  it("offers the system voice and ElevenLabs, not the Dialogue voice", () => {
    expect(setupVoices("Built in.").map((one) => one.value)).toEqual(["system", "elevenlabs"]);
  });

  it("gives an older setup that named ElevenLabs the ElevenLabs voice", () => {
    expect(speechFromOlderSetup({ voiceService: "elevenlabs" })?.provider).toBe("elevenlabs");
    expect(speechFromOlderSetup({ voiceService: "system" })).toBeNull();
    expect(speechFromOlderSetup(null)).toBeNull();
  });
});
