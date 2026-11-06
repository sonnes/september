import { useSyncExternalStore } from "react";

import { platform } from "@platform/adapter";
import { fileSound, speakableText, stripTags } from "@september/core/rules/audio-tags";
import { wordAt } from "@september/core/rules/spoken-word";
import {
  DEFAULT_VOICE_MODEL,
  dialogueModelFrom,
  dialogueParts,
  elevenLabsCredits,
  stabilityFor,
  voiceModelFrom,
} from "@september/core/rules/voice";

import { InterruptedSpeech, type CloudVoice } from "../platform";
import { currentSetup, savedSpeech } from "./settings";
import { recordTtsUsage } from "./usage";

export type VoiceService = "system" | "elevenlabs" | "dialogue";

/** Everything that shapes the sound. All of it names the audio file. */
export interface SpeechSettings {
  provider: VoiceService;
  voiceId: string | null;
  modelId: string;
  /** The model of the Dialogue voice: Eleven v3 or Eleven v3 Conversational. */
  dialogueModelId?: string;
  stability: number;
  similarity: number;
  speed: number;
}

export const DEFAULT_SPEECH: SpeechSettings = {
  provider: "system",
  voiceId: null,
  modelId: DEFAULT_VOICE_MODEL,
  stability: 0.5,
  similarity: 0.75,
  speed: 1,
};

/**
 * The settings in use. The Voice screen owns them. Before the user chooses,
 * the service that setup chose decides.
 */
export function speechSettings(): SpeechSettings {
  const saved = savedSpeech.get();
  if (saved) {
    const kept = { ...DEFAULT_SPEECH, ...saved };
    return { ...kept, modelId: voiceModelFrom(kept.modelId) };
  }
  return {
    ...DEFAULT_SPEECH,
    provider: currentSetup()?.voiceService === "elevenlabs" ? "elevenlabs" : "system",
  };
}

/** Changes some of the speech settings and keeps the rest. */
export async function updateSpeech(patch: Partial<SpeechSettings>): Promise<SpeechSettings> {
  const next = { ...speechSettings(), ...patch };
  await savedSpeech.set(next);
  return next;
}

/** The cloud voice of the settings, with the values its model takes. */
function cloudVoiceOf(settings: SpeechSettings): CloudVoice {
  if (!settings.voiceId) throw new Error("Choose an ElevenLabs voice first.");
  const modelId =
    settings.provider === "dialogue"
      ? dialogueModelFrom(settings.dialogueModelId)
      : settings.modelId;
  return {
    voiceId: settings.voiceId,
    modelId,
    stability: settings.provider === "dialogue"
      ? stabilityFor(modelId, settings.stability)
      : settings.stability,
    similarity: settings.similarity,
    speed: settings.speed,
  };
}

/**
 * The words and the voice of a sound file in the voice in use. A file of the
 * Dialogue voice uses Eleven v3, and a voice that says tags aloud gets the
 * words alone.
 */
export function soundFile(words: string): { text: string; voice: CloudVoice } {
  const { text, settings } = fileSound(words, speechSettings());
  if (!settings.voiceId) throw new Error("Choose an ElevenLabs voice first.");
  return {
    text,
    voice: {
      voiceId: settings.voiceId,
      modelId: settings.modelId,
      stability: settings.stability,
      similarity: settings.similarity,
      speed: settings.speed,
    },
  };
}

interface SpeechProvider {
  /** Speaks one sentence. It resolves when the sound stops. */
  speak(text: string, signal: AbortSignal): Promise<void>;
}

const systemVoice = (settings: SpeechSettings): SpeechProvider => ({
  async speak(text, signal) {
    const started = Date.now();
    const usage = {
      provider: "system" as const,
      model: platform.voice.systemName,
      voice_id: settings.voiceId ?? undefined,
      text_length: text.length,
      credits: 0,
      duration_seconds: 0,
      cached: false,
      cost_usd: 0,
      cost_source: "free" as const,
    };
    try {
      await platform.voice.speakSystem(text, settings, (at) => setSpokenWord(wordAt(text, at)));
    } catch (reason) {
      recordTtsUsage({
        ...usage,
        latency_ms: Date.now() - started,
        success: false,
        error_message: reason instanceof Error ? reason.message : String(reason),
      });
      if (!signal.aborted) throw reason;
      return;
    }
    recordTtsUsage({ ...usage, latency_ms: Date.now() - started, success: true });
  },
});

/** The ElevenLabs voice, or the ElevenLabs Dialogue voice with Eleven v3. */
const cloudVoice = (settings: SpeechSettings): SpeechProvider => ({
  async speak(text, signal) {
    const started = Date.now();
    const model =
      settings.provider === "dialogue"
        ? dialogueModelFrom(settings.dialogueModelId)
        : settings.modelId;
    let heard: { fromCache: boolean; latencyMs: number };
    try {
      heard = await platform.voice.stream(
        text,
        cloudVoiceOf(settings),
        settings.provider === "dialogue" ? dialogueParts(text) : undefined,
        signal,
      );
    } catch (reason) {
      recordTtsUsage({
        provider: "elevenlabs",
        model,
        voice_id: settings.voiceId ?? undefined,
        text_length: text.length,
        duration_seconds: 0,
        latency_ms: Date.now() - started,
        success: false,
        cached: false,
        cost_source: "unknown",
        error_message: reason instanceof Error ? reason.message : String(reason),
      });
      if (signal.aborted) return;
      // The listener heard the first words, and a second voice would say them again.
      if (reason instanceof InterruptedSpeech) throw reason;
      // A person who cannot speak must not meet silence, so the system voice
      // says the words. It says a tag aloud, so it gets the words alone, and
      // a cloud voice ID names no voice of the system.
      await systemVoice({ ...settings, voiceId: null }).speak(stripTags(text), signal);
      if (!signal.aborted) {
        setFallback("The chosen voice did not answer, so this device spoke instead.");
      }
      return;
    }
    if (signal.aborted) return;

    const credits = heard.fromCache ? 0 : elevenLabsCredits(text, model);
    recordTtsUsage({
      provider: "elevenlabs",
      model,
      voice_id: settings.voiceId ?? undefined,
      text_length: text.length,
      credits,
      duration_seconds: 0,
      latency_ms: heard.latencyMs,
      success: true,
      cached: heard.fromCache,
      cost_usd: heard.fromCache ? 0 : undefined,
      cost_source: heard.fromCache ? "free" : credits === undefined ? "unknown" : "quota",
    });
    setFallback(null);
  },
});

const providerFor = (settings: SpeechSettings): SpeechProvider =>
  settings.provider === "system" ? systemVoice(settings) : cloudVoice(settings);

let speakingId: string | null = null;
let spokenWord: { id: string; word: number } | null = null;
let fallback: string | null = null;
let active: AbortController | null = null;
const listeners = new Set<() => void>();

const announce = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function setSpokenWord(word: number): void {
  if (!speakingId) return;
  spokenWord = { id: speakingId, word };
  announce();
}

function setFallback(reason: string | null): void {
  fallback = reason;
  announce();
}

/**
 * Speaks one sentence with the settings in use, and resolves true only when
 * the sentence finished. `id` names the thing that speaks, so a screen can
 * mark it. A second call stops the first sentence.
 */
export async function speak(text: string, id = "composer"): Promise<boolean> {
  const words = text.trim();
  if (!words) return false;

  stopSpeaking();
  const request = new AbortController();
  active = request;
  speakingId = id;
  setFallback(null);
  const cancelled = new Promise<boolean>((resolve) => {
    request.signal.addEventListener("abort", () => resolve(false), { once: true });
  });
  const settings = speechSettings();
  const playback = providerFor(settings)
    .speak(speakableText(words, settings), request.signal)
    .then(
      () => !request.signal.aborted,
      () => {
        if (!request.signal.aborted) {
          setFallback("Speech could not play. Try again or show your words on screen.");
        }
        return false;
      },
    );
  try {
    return await Promise.race([playback, cancelled]);
  } finally {
    if (active === request) {
      active = null;
      speakingId = null;
      spokenWord = null;
      announce();
    }
  }
}

export function stopSpeaking(): void {
  active?.abort();
  active = null;
  speakingId = null;
  spokenWord = null;
  announce();
  platform.voice.stop().catch(() => {
    setFallback("Speech could not stop. Try again.");
  });
}

/** The word the voice reads now, with the thing that speaks it. */
export function useSpokenWord(): { id: string; word: number } | null {
  return useSyncExternalStore(subscribe, () => spokenWord, () => null);
}

/** The thing that is speaking, or nothing. */
export function useSpeaking(): string | null {
  return useSyncExternalStore(subscribe, () => speakingId, () => null);
}

/** A speech failure, or the notice of a fallback voice. */
export function useVoiceFallback(): string | null {
  return useSyncExternalStore(subscribe, () => fallback, () => null);
}
