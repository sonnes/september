import { useSyncExternalStore } from "react";

import {
  currentSetup,
  currentSpeech,
  InterruptedSpeech,
  speakSystem,
  stopNativeSpeech,
  streamSpeech,
} from "@/services/os";
import { elevenLabsCredits } from "@/rules/usage-summary";
import { recordTtsUsage } from "@/services/usage";
import {
  DEFAULT_VOICE_MODEL,
  dialogueModelFrom,
  voiceModelFrom,
} from "@september/core/rules/voice";
import { speakableText, stripTags } from "@september/core/rules/audio-tags";

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
 * The settings in use. The Voice screen owns them. Before that screen runs,
 * the service that setup chose decides.
 */
export function speechSettings(): SpeechSettings {
  const saved = currentSpeech();
  // ElevenLabs deprecated Turbo, so a saved Turbo model reads as its Flash replacement.
  if (saved) {
    const kept = { ...DEFAULT_SPEECH, ...saved };
    return { ...kept, modelId: voiceModelFrom(kept.modelId) };
  }

  const setup = currentSetup();
  return {
    ...DEFAULT_SPEECH,
    provider: setup?.voiceService === "elevenlabs" ? "elevenlabs" : "system",
  };
}

export interface SpeechProvider {
  readonly id: VoiceService;
  /** Speaks one sentence. It resolves when the sound stops. */
  speak(text: string, signal?: AbortSignal): Promise<void>;
  /** Stops the sound now. */
  stop(): void;
}

const systemVoice = (settings: SpeechSettings): SpeechProvider => ({
  id: "system",
  async speak(text, signal) {
    const started = Date.now();
    try {
      await speakSystem(text, settings);
      void recordTtsUsage({
        provider: "system",
        model: "macOS system voice",
        voice_id: settings.voiceId ?? undefined,
        text_length: text.length,
        credits: 0,
        duration_seconds: 0,
        latency_ms: Date.now() - started,
        success: true,
        cached: false,
        cost_usd: 0,
        cost_source: "free",
      });
    } catch (reason) {
      void recordTtsUsage({
        provider: "system",
        model: "macOS system voice",
        voice_id: settings.voiceId ?? undefined,
        text_length: text.length,
        credits: 0,
        duration_seconds: 0,
        latency_ms: Date.now() - started,
        success: false,
        cached: false,
        cost_usd: 0,
        cost_source: "free",
        error_message: reason instanceof Error ? reason.message : String(reason),
      });
      if (!signal?.aborted) throw reason;
    }
  },
  stop: () => void stopNativeSpeech().catch(() => undefined),
});

/** The ElevenLabs voice, or the ElevenLabs Dialogue voice with Eleven v3. */
const cloudVoice = (settings: SpeechSettings): SpeechProvider => ({
  id: settings.provider,
  async speak(text, signal) {
    const started = Date.now();
    const model =
      settings.provider === "dialogue"
        ? dialogueModelFrom(settings.dialogueModelId)
        : settings.modelId;
    let heard: { from_cache: boolean; latency_ms: number };
    try {
      heard = await streamSpeech(text, settings, signal);
    } catch (reason) {
      void recordTtsUsage({
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
      if (signal?.aborted) return;
      // The listener already heard the first words. A second voice says them
      // again, so the notice of `speak()` reports the break instead.
      if (reason instanceof InterruptedSpeech) throw reason;
      // A person who cannot speak must not meet silence, so the voice of the
      // operating system says the words instead. It says a tag aloud, so it
      // gets the words alone.
      await systemVoice(settings).speak(stripTags(text), signal);
      if (!signal?.aborted) setFallback("The chosen voice did not answer, so this device spoke instead.");
      return;
    }

    const credits = heard.from_cache
      ? 0
      : elevenLabsCredits(text, model);
    void recordTtsUsage({
      provider: "elevenlabs",
      model,
      voice_id: settings.voiceId ?? undefined,
      text_length: text.length,
      credits,
      duration_seconds: 0,
      latency_ms: heard.latency_ms,
      success: true,
      cached: heard.from_cache,
      cost_usd: heard.from_cache ? 0 : undefined,
      cost_source: heard.from_cache
        ? "free"
        : credits === undefined
          ? "unknown"
          : "quota",
    });
    if (!signal?.aborted) setFallback(null);
  },
  stop() {
    void stopNativeSpeech().catch(() => undefined);
  },
});

export function providerFor(settings: SpeechSettings): SpeechProvider {
  return settings.provider === "system"
    ? systemVoice(settings)
    : cloudVoice(settings);
}

// --------------------------------------------------- what is speaking now

let speakingId: string | null = null;
let fallback: string | null = null;
const listeners = new Set<() => void>();

const announce = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function setFallback(reason: string | null): void {
  fallback = reason;
  announce();
}

/**
 * Speaks one sentence with the settings in use.
 *
 * `id` names the thing that is speaking, so a screen can mark it. A second
 * call stops the first sentence.
 */
let active: AbortController | null = null;

/** Returns true only when the current request finishes speaking successfully. */
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
      announce();
    }
  }
}

export function stopSpeaking(): void {
  active?.abort();
  active = null;
  providerFor(speechSettings()).stop();
  speakingId = null;
  announce();
}

/** The thing that is speaking, or nothing. */
export function useSpeaking(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => speakingId,
    () => null,
  );
}

/** A user-facing speech failure or successful fallback notice. */
export function useVoiceFallback(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => fallback,
    () => null,
  );
}
