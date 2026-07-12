/**
 * Module-level status store for the Kokoro model download/load lifecycle.
 * Shared across every `KokoroSpeechProvider` instance (the worker and model
 * are singletons) so any component can render download progress via
 * `useKokoroModelStatus`.
 */
export type KokoroModelStatus =
  | { state: 'idle' }
  | { state: 'loading'; progress: number }
  | { state: 'ready'; device: 'webgpu' | 'wasm' }
  | { state: 'error'; message: string };

let status: KokoroModelStatus = { state: 'idle' };
const listeners = new Set<() => void>();

export function getKokoroModelStatus(): KokoroModelStatus {
  return status;
}

export function subscribeKokoroModelStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setKokoroModelStatus(next: KokoroModelStatus): void {
  status = next;
  for (const listener of listeners) listener();
}
