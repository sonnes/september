# Plan: Kokoro TTS + full in-browser privacy mode

Research: [../research/2026-07-12-kokoro-privacy-mode.md](../research/2026-07-12-kokoro-privacy-mode.md)
Approved: 2026-07-12 ("do all").

## Phase 1 — Production-grade Kokoro provider

- Model id → `onnx-community/Kokoro-82M-v1.0-ONNX` (current code loads the old
  v0.19 export with a v1.0 voice list).
- Backend selection: WebGPU (`fp32`) when `navigator.gpu` adapter available,
  else WASM (`q8`). Runtime fallback: webgpu load failure retries on wasm.
- Run load + inference in a module Web Worker (main-thread wasm inference
  freezes the UI). Worker protocol: `load` / `generate` in;
  `load-progress` / `ready` / `chunk` / `done` / `error` out. Float32 chunks
  transferred, not copied.
- Model status store (`idle | loading | ready | error`) + `useKokoroModelStatus`
  hook + download progress UI in the Kokoro settings block, with explicit
  "Download voice" preload button. `preloadKokoro()` exported.
- Reuse `pcmToWavDataUri` from `@/packages/audio` (drop the provider's own WAV
  encoder).
- Estimated character alignment from per-chunk text + audio duration so
  captions/reels work (`Alignment` = `{characters, start_times, end_times}`).
- Schema: add `voice` to `SpeechConfigSchema.settings`.
- Vite: `optimizeDeps.exclude` for `kokoro-js` / `@huggingface/transformers`.

## Phase 2 — Streaming speak

- `SpeechEngine.generateSpeechStream` socket param becomes optional.
- Kokoro implements it via the worker chunk stream → `hooks.onAudioChunk`.
- `useSpeech.generateSpeechStream` branches: ElevenLabs keeps the warm-socket
  path (still behind `VITE_DISABLE_WS_TTS`); Kokoro gets a
  `PcmStreamPlayer(24000, sinkId)` with no socket.

## Phase 3 — Privacy-mode wiring

- `buildPrivacyModeUpdate`: speech provider → `kokoro` (voice `af_heart`),
  suggestions provider preset to `webllm` (stays disabled — enabling is one
  toggle, no key), transcription provider preset to `whisper`.
- Copy updates in `SETUP_MODES` + onboarding finish step: honest note about the
  one-time voice download; browser speech remains the instant fallback.
- `finish-privacy.tsx` kicks off `preloadKokoro()` so the model downloads while
  the user lands in the app.

## Phase 4 — Feature parity

- Reel export accepts Kokoro (estimated alignment) — gate becomes "voice with
  timing" (`elevenlabs` or `kokoro`) instead of ElevenLabs-only.
- Local Whisper STT: new `whisper` transcription provider
  (`onnx-community/whisper-base` via `@huggingface/transformers`, worker,
  webgpu→wasm fallback). `useTranscribe` branches to it; registry + schema
  updated so it appears in transcription settings.
- Voice cloning stays ElevenLabs-only (already hidden without a key).

## Out of scope

- Self-hosting model weights (HF CDN + browser Cache API is acceptable for v1).
- Full-offline PWA/service worker.
- Word-timestamped Kokoro ONNX export (kokoro-js support unverified).
