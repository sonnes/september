/** Inference backend for the on-device Kokoro model. */
export interface KokoroBackend {
  device: 'webgpu' | 'wasm';
  dtype: 'fp32' | 'q8';
}

/**
 * Pair device with the dtype kokoro-js recommends for it: fp32 on WebGPU
 * (q8/fp16 have known audio-corruption issues there), q8 on WASM (small
 * download, near-fp32 quality, and fp32 on CPU is too slow).
 */
export function pickKokoroBackend(hasWebGpu: boolean): KokoroBackend {
  return hasWebGpu ? { device: 'webgpu', dtype: 'fp32' } : { device: 'wasm', dtype: 'q8' };
}

/** True when the browser exposes a usable WebGPU adapter. */
export async function detectWebGpu(): Promise<boolean> {
  try {
    const gpu = (globalThis.navigator as Navigator & {
      gpu?: { requestAdapter(): Promise<unknown | null> };
    })?.gpu;
    if (!gpu) return false;
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}
