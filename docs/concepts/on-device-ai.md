---
title: On-device AI (privacy mode)
description: Local speech, transcription, and text providers keep user content on the device in the web and desktop apps.
package: speech, ai, desktop
---

# On-device AI (privacy mode)

Privacy mode promises "everything stays on this device". The web app runs three
local providers in the browser. Each browser provider uses a Web Worker and
WebGPU with a WASM fallback.

The browser downloads model weights once from the Hugging Face CDN. It stores
the weights in the browser Cache API.

| Feature | Provider id | Model | Where |
| --- | --- | --- | --- |
| Speech (TTS) | `kokoro` | Kokoro-82M v1.0 (kokoro-js) | `speech/lib/providers/kokoro*.ts` |
| Transcription (STT) | `whisper` | onnx-community/whisper-base | `ai/lib/whisper*.ts` |
| Suggestions | `webllm` | WebLLM models (Llama 3.2 1B default) | `@built-in-ai/web-llm` via `useGenerate` |

The desktop app has a separate local text provider:

| Feature | Provider id | Model | Where |
| --- | --- | --- | --- |
| Suggestions and text generation | `apfel` | Apple on-device foundation model | `apps/desktop/src-tauri/src/apfel.rs` |

The desktop backend bundles apfel v1.9.1 on Apple Silicon. Apfel uses the Apple
Foundation Models framework on macOS 26 or later. Apple Intelligence must be
enabled.

Rust starts apfel when the desktop app first asks for its status or a
generation. The server binds to a free loopback port and requires a
process-specific bearer token. Rust reuses the server while it stays healthy
and replaces it when its health request fails. The desktop WebView accesses it
only through Tauri commands.

Unsupported systems still start September. The status command reports that
the provider is unsupported. The Rust backend does not use a cloud fallback.

Privacy mode uses `buildPrivacyModeUpdate` during onboarding. It enables Kokoro
speech with the `af_heart` voice. It also starts the model download through
`preloadKokoro()`.

Privacy mode presets Whisper transcription and WebLLM suggestions. It does not
enable them. The user must enable each larger download in Settings.

Kokoro streams sentence chunks through `generateSpeechStream`. This process
decreases the initial delay for Talk speech. Kokoro also returns estimated
character alignment for reel export and caption highlighting.

`useKokoroModelStatus` reports the download progress. `KokoroModelCard` shows
this progress in the speech settings.

The browser providers use the network for the one-time model download. Apfel
uses the Apple model that is already on the Mac. No provider sends user content
to September servers.

Developers download the pinned apfel release before desktop development or
packaging. The released desktop app contains the verified binary.

Voice cloning has no local equivalent and remains ElevenLabs-only.
