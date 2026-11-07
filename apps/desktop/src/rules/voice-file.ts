import {
  DIALOGUE_MODEL,
  dialogueModelFrom,
  stabilityFor,
  type SpeechSettings,
} from "@september/core/rules/voice";

/** The settings that name a voice file in `src-tauri/src/speech.rs`. */
export interface FileSettings {
  provider: string;
  modelId: string;
  stability: number;
  similarity: number;
  speed: number;
}

/**
 * The settings that name the voice file of a sentence.
 *
 * A file of the ElevenLabs voice is named with the saved settings. A file of
 * the Dialogue voice is named with its chosen model. A live Dialogue sentence
 * keeps the saved stability and speed in its name. A Dialogue file takes the
 * stability mode of Eleven v3 and the normal speed, as the file is made.
 */
export function fileSettings(settings: SpeechSettings, use: "live" | "file"): FileSettings {
  const { provider, similarity } = settings;
  if (provider !== "dialogue") {
    const { modelId, stability, speed } = settings;
    return { provider, modelId, stability, similarity, speed };
  }
  const modelId = dialogueModelFrom(settings.dialogueModelId);
  return use === "live"
    ? { provider, modelId, stability: settings.stability, similarity, speed: settings.speed }
    : {
        provider,
        modelId,
        stability: stabilityFor(DIALOGUE_MODEL, settings.stability),
        similarity,
        speed: 1,
      };
}
