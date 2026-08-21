import { useSyncExternalStore } from "react";

import {
  audioUrl,
  currentSetup,
  currentSpeech,
  synthesizeSpeech,
} from "./os";
import { play, stop as stopPlayer } from "./player";

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
  speak: (text) =>
    new Promise((resolve) => {
      const voice = globalThis.speechSynthesis;
      if (!voice) return resolve();

      voice.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.speed;

      const chosen = settings.voiceId
        ? voice.getVoices().find((one) => one.voiceURI === settings.voiceId)
        : undefined;
      if (chosen) utterance.voice = chosen;

      // A voice that fails still resolves. The caller only needs to know
      // that the sound stopped.
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      voice.speak(utterance);
    }),
  stop: () => globalThis.speechSynthesis?.cancel(),
});

const cloudVoice = (settings: SpeechSettings): SpeechProvider => ({
  id: "elevenlabs",
  async speak(text) {
    try {
      const { path } = await synthesizeSpeech(text, settings);
      await play(audioUrl(path));
      setFallback(null);
    } catch (reason) {
      // A person who cannot speak must not meet silence, so the voice of the
      // operating system says the words instead.
      setFallback(reason instanceof Error ? reason.message : String(reason));
      await systemVoice(settings).speak(text);
    }
  },
  stop() {
    stopPlayer();
    globalThis.speechSynthesis?.cancel();
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
