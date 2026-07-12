---
title: On-device AI (privacy mode)
description: Local speech, transcription, and suggestions providers that run models in the browser so nothing the user writes or says leaves the device.
package: speech, ai
---

# On-device AI (privacy mode)

Privacy mode promises "everything stays on this device". Three local providers
back that promise, each running a model in the browser (Web Worker + WebGPU
with WASM fallback, weights downloaded once from the Hugging Face CDN and
cached in the browser Cache API):

| Feature | Provider id | Model | Where |
| --- | --- | --- | --- |
| Speech (TTS) | `kokoro` | Kokoro-82M v1.0 (kokoro-js) | `speech/lib/providers/kokoro*.ts` |
| Transcription (STT) | `whisper` | onnx-community/whisper-base | `ai/lib/whisper*.ts` |
| Suggestions | `webllm` | WebLLM models (Llama 3.2 1B default) | `@built-in-ai/web-llm` via `useGenerate` |

Choosing **Privacy mode** in onboarding (`buildPrivacyModeUpdate`) enables
Kokoro speech (voice `af_heart`) and starts its model download
(`preloadKokoro()`), and presets — but does not enable — Whisper transcription
and WebLLM suggestions, so their larger downloads stay behind an explicit
toggle in Settings.

Kokoro is a first-class speech engine: it streams sentence chunks for
low-latency Talk speak (`generateSpeechStream`), returns estimated character
alignment so reel export and caption highlighting work, and reports download
progress through `useKokoroModelStatus` (rendered by `KokoroModelCard` in
speech settings).

The only network traffic any of these produce is the one-time model download;
no user content is ever sent. Voice cloning has no local equivalent and remains
ElevenLabs-only.
