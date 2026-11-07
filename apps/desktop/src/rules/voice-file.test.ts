import { describe, expect, it } from "vitest";

import { DEFAULT_SPEECH, type SpeechSettings } from "@september/core/rules/voice";

import { fileSettings } from "./voice-file";

const saved = (patch: Partial<SpeechSettings>): SpeechSettings => ({
  ...DEFAULT_SPEECH,
  voiceId: "voice-1",
  stability: 0.6,
  similarity: 0.7,
  speed: 1.2,
  ...patch,
});

describe("fileSettings", () => {
  it("names an ElevenLabs file with the saved settings, live or in a file", () => {
    const settings = saved({ provider: "elevenlabs", modelId: "eleven_v3" });
    const named = {
      provider: "elevenlabs",
      modelId: "eleven_v3",
      stability: 0.6,
      similarity: 0.7,
      speed: 1.2,
    };

    expect(fileSettings(settings, "live")).toEqual(named);
    expect(fileSettings(settings, "file")).toEqual(named);
  });

  it("names a live Dialogue sentence with its model and the saved settings", () => {
    const settings = saved({ provider: "dialogue", dialogueModelId: "eleven_v3_conversational" });

    expect(fileSettings(settings, "live")).toEqual({
      provider: "dialogue",
      modelId: "eleven_v3_conversational",
      stability: 0.6,
      similarity: 0.7,
      speed: 1.2,
    });
  });

  it("names a Dialogue file with its model, the stability mode, and the normal speed", () => {
    const settings = saved({ provider: "dialogue", dialogueModelId: "eleven_v3_conversational" });

    expect(fileSettings(settings, "file")).toEqual({
      provider: "dialogue",
      modelId: "eleven_v3_conversational",
      stability: 0.5,
      similarity: 0.7,
      speed: 1,
    });
  });

  it("names a Dialogue voice without a saved model with Eleven v3", () => {
    expect(fileSettings(saved({ provider: "dialogue" }), "live").modelId).toBe("eleven_v3");
  });
});
