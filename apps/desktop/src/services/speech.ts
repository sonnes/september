import { useSyncExternalStore } from "react";

import {
  currentSetup,
  currentSpeech,
  playSpeechFile,
  speakSystem,
  stopNativeSpeech,
  synthesizeSpeech,
} from "@/services/os";
import { elevenLabsCredits } from "@/rules/usage-summary";
import { recordTtsUsage } from "@/services/usage";

export type VoiceService = "system" | "elevenlabs";

/** Everything that shapes the sound. All of it names the audio file. */
export interface SpeechSettings {
  provider: VoiceService;
  voiceId: string | null;
  modelId: string;
  stability: number;
  similarity: number;
  speed: number;
}

export const DEFAULT_SPEECH: SpeechSettings = {
  provider: "system",
  voiceId: null,
  modelId: "eleven_turbo_v2_5",
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
  if (saved) return { ...DEFAULT_SPEECH, ...saved };

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

const cloudVoice = (settings: SpeechSettings): SpeechProvider => ({
  id: "elevenlabs",
  async speak(text, signal) {
    const started = Date.now();
    let path: string;
    try {
      const result = await synthesizeSpeech(text, settings);
      path = result.path;
      if (signal?.aborted) {
        if (path.startsWith("blob:")) URL.revokeObjectURL(path);
        return;
      }
      const credits = result.from_cache
        ? 0
        : elevenLabsCredits(text, settings.modelId);
      void recordTtsUsage({
        provider: "elevenlabs",
        model: settings.modelId,
        voice_id: settings.voiceId ?? undefined,
        text_length: text.length,
        credits,
        duration_seconds: 0,
        latency_ms: Date.now() - started,
        success: true,
        cached: result.from_cache,
        cost_usd: result.from_cache ? 0 : undefined,
        cost_source: result.from_cache
          ? "free"
          : credits === undefined
            ? "unknown"
            : "quota",
      });
    } catch (reason) {
      void recordTtsUsage({
        provider: "elevenlabs",
        model: settings.modelId,
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
      await systemVoice(settings).speak(text, signal);
      if (!signal?.aborted) setFallback("The chosen voice did not answer, so this device spoke instead.");
      return;
    }

    try {
      await playSpeechFile(path);
      if (!signal?.aborted) setFallback(null);
    } catch {
      // A person who cannot speak must not meet silence, so the voice of the
      // operating system says the words instead.
      if (signal?.aborted) return;
      await systemVoice(settings).speak(text, signal);
      if (!signal?.aborted) setFallback("The chosen voice did not answer, so this device spoke instead.");
    }
  },
  stop() {
    void stopNativeSpeech().catch(() => undefined);
  },
});

export function providerFor(settings: SpeechSettings): SpeechProvider {
  return settings.provider === "elevenlabs"
    ? cloudVoice(settings)
    : systemVoice(settings);
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
  const playback = providerFor(speechSettings()).speak(words, request.signal).then(
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
