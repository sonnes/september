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
  speak(text: string): Promise<void>;
  /** Stops the sound now. */
  stop(): void;
}

const systemVoice = (settings: SpeechSettings): SpeechProvider => ({
  id: "system",
  async speak(text) {
    const started = Date.now();
    try {
      await speakSystem(text, settings);
      void recordTtsUsage({
        provider: "system",
        model: "browser system voice",
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
        model: "browser system voice",
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
      // The caller only needs to know that the sound stopped.
    }
  },
  stop: () => void stopNativeSpeech().catch(() => undefined),
});

const cloudVoice = (settings: SpeechSettings): SpeechProvider => ({
  id: "elevenlabs",
  async speak(text) {
    const started = Date.now();
    let path: string;
    try {
      const result = await synthesizeSpeech(text, settings);
      path = result.path;
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
      setFallback(reason instanceof Error ? reason.message : String(reason));
      await systemVoice(settings).speak(text);
      return;
    }

    try {
      await playSpeechFile(path);
      setFallback(null);
    } catch (reason) {
      // A person who cannot speak must not meet silence, so the voice of the
      // operating system says the words instead.
      setFallback(reason instanceof Error ? reason.message : String(reason));
      await systemVoice(settings).speak(text);
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
export async function speak(text: string, id = "composer"): Promise<void> {
  const words = text.trim();
  if (!words) return;

  const provider = providerFor(speechSettings());
  provider.stop();

  speakingId = id;
  announce();
  try {
    await provider.speak(words);
  } finally {
    if (speakingId === id) {
      speakingId = null;
      announce();
    }
  }
}

export function stopSpeaking(): void {
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

/** Why the cloud voice did not speak, when it did not. */
export function useVoiceFallback(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => fallback,
    () => null,
  );
}
