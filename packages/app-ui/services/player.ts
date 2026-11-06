import { useSyncExternalStore } from "react";

/** One audio element. A new file replaces the one that plays. */
let element: HTMLAudioElement | null = null;
let source: string | null = null;
const listeners = new Set<() => void>();

function announce(): void {
  for (const listener of listeners) listener();
}

function clear(audio: HTMLAudioElement): void {
  if (element !== audio) return;
  element = null;
  source = null;
  announce();
}

/** Plays one file. It resolves when the sound stops. */
export function play(url: string): Promise<void> {
  stop();

  const audio = new Audio(url);
  element = audio;
  source = url;
  announce();

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      clear(audio);
      resolve();
    };
    audio.onerror = () => {
      clear(audio);
      reject(new Error("The audio file did not play."));
    };
    audio.play().catch((reason) => {
      clear(audio);
      reject(reason);
    });
  });
}

export function stop(): void {
  element?.pause();
  if (element) clear(element);
}

/** The file that is playing, or nothing. */
export function usePlayingSource(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => source,
    () => null,
  );
}
