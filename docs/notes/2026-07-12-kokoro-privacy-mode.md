---
plan: ../plans/2026-07-12-kokoro-privacy-mode.md
---

# Implementation notes: Kokoro + privacy mode

Decisions where the plan/spec was silent, and deviations. Updated as work
proceeds.

- **dtype pairing**: followed kokoro-js official guidance — `fp32` on WebGPU
  (~326 MB), `q8` on WASM (~86 MB). `q8`/`fp16` on WebGPU have known audio
  corruption issues upstream.
- **Worker singleton is module-level**, not per-provider-instance:
  `useSpeech`'s registry recreates `KokoroSpeechProvider` whenever
  `getProviderConfig` identity changes, so instance state would re-download the
  model.
- **Alignment is estimated** (uniform per-character distribution of each
  chunk's audio duration), not model-derived. Good enough for reel captions,
  which group characters into words; not phoneme-accurate. Chunks are joined
  with a space character that shares the following chunk's time budget.
- **Privacy mode presets but does not enable** local suggestions (WebLLM,
  `Llama-3.2-1B` default) and local transcription (Whisper) — both are large
  downloads, so enabling stays a single explicit toggle in Settings instead of
  a surprise gigabyte fetch at onboarding. Kokoro *is* enabled and preloaded
  (`preloadKokoro()` fires on privacy finish) since a working voice is the
  app's core promise.
- **Whisper always uses `q8`** on both wasm and webgpu (simpler than the
  per-module dtype maps in the transformers.js webgpu examples; verified
  working). Whisper worker has no progress store — transcription settings show
  no download bar; acceptable for now since first transcription just takes
  longer.
- **`SpeechConfig.enabled` added to the shared type** — the persisted Zod
  schema already had it; the shared TS interface had drifted.
- **Vite**: `optimizeDeps.exclude` for kokoro-js/transformers + `worker.format:
  'es'` (module workers use dynamic import; iife workers can't code-split).
- **track() provider field** stays `undefined` for Kokoro streaming (the usage
  event type only distinguishes elevenlabs today).
- **Verified in browser** (dev server, in-app Chromium): privacy onboarding →
  Kokoro provider + Heart voice persisted; model card download progress →
  "Ready — running on GPU"; Talk speak generated and stored audio with no
  console errors; Whisper round-trip test transcribed the Kokoro-generated WAV
  back verbatim ("Hello there. This voice runs entirely in my browser."). Not
  verified live: reel MP4 render with Kokoro timing (unit-tested only), wasm
  fallback on a non-WebGPU browser, mic-recorded dictation through the
  Whisper path.
- **Pre-existing `tsc --noEmit` errors** in untouched files (router search
  params, TanStack DB generics, etc.) were left alone; repo gates on
  eslint/vitest/vite build, all green.
