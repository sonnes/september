# Kokoro TTS integration + full in-browser privacy mode

Research into what it takes to (a) make Kokoro TTS a first-class speech engine
and (b) get every feature working in privacy mode with nothing leaving the
browser.

## Headline

Kokoro is already half-integrated. `kokoro-js@^1.2.1` is a dependency,
`KokoroSpeechProvider` exists (`apps/web/src/packages/speech/lib/providers/kokoro.ts`),
it's registered unconditionally in `useSpeech`, it's a valid
`SpeechConfig.provider` enum value, and it has a settings UI block. What's
missing is robustness (WebGPU-only, main-thread inference, stale model id, no
progress UX, no streaming) and the privacy-mode wiring (onboarding still forces
`browser` TTS; several features remain cloud-only).

## Kokoro facts (verified 2026-07)

- **Library**: [kokoro-js](https://www.npmjs.com/package/kokoro-js) (Apache-2.0),
  built on Transformers.js / onnxruntime-web. Model: Kokoro-82M v1.0.
- **Model id**: `onnx-community/Kokoro-82M-v1.0-ONNX`. Our provider still loads
  the **old v0.19 id** `onnx-community/Kokoro-82M-ONNX` — but the hardcoded
  voice list (`af_heart`, `am_echo`, …) is the **v1.0** voice set, so several
  listed voices don't exist in the loaded model.
- **Size**: ~86 MB at `q8` (near-indistinguishable from fp32); fp32 ~326 MB.
  Voice embeddings are small (~0.5 MB each, fetched per voice).
- **Devices**: `wasm` (CPU, works everywhere) and `webgpu`. Recommended pairing:
  `q8` + wasm, `fp32` + webgpu. WebGPU now ships in Chrome/Edge/Firefox and
  Safari 26+ (macOS/iOS/iPadOS, Sept 2025), but feature-detect + wasm fallback
  is still required (older Safari, Linux driver denylists).
- **Speed**: WebGPU ≈ 10 s of audio per ~1 s of compute; wasm is slower but
  usable for sentence-length text.
- **Streaming**: `TextSplitterStream` + `tts.stream(splitter)` yields
  `{ text, phonemes, audio }` per sentence chunk — maps cleanly onto our
  existing `generateSpeechStream` hook shape and `PcmStreamPlayer`.
- **Output**: 24 kHz mono Float32 PCM (`RawAudio { audio, sampling_rate }`).
- **Caching**: Transformers.js caches weights in the browser Cache API by
  default — first use downloads from the HuggingFace CDN, later uses are
  offline. Self-hosting is possible via `env.remoteHost`/`localModelPath`.
- **Timestamps**: an `onnx-community/Kokoro-82M-v1.0-ONNX-timestamped` export
  exists (word-level timestamps). kokoro-js support for it is unverified — open
  question for the reel-caption alignment story.
- **No voice cloning.** Kokoro cannot replace the ElevenLabs cloning feature.

## Current state of the provider (gaps)

`apps/web/src/packages/speech/lib/providers/kokoro.ts`:

1. **Stale model id** (`:153`) — v0.19 model with a v1.0 voice list (see above).
2. **`device: 'webgpu'` hardcoded** (`:155`) — no `navigator.gpu` detection, no
   wasm fallback; fails outright on non-WebGPU browsers.
3. **Inference on the main thread** — an 82M-param forward pass (especially on
   wasm) freezes the UI. Needs a module Web Worker
   (`new Worker(new URL(...), { type: 'module' })`, Vite-native).
4. **No download-progress UX** — `from_pretrained` accepts `progress_callback`;
   provider only `console.log`s. First use = ~86 MB silent stall.
5. **No `generateSpeechStream`** — buffered WAV data-URI only; Kokoro never
   benefits from the low-latency Talk path added for ElevenLabs.
6. **No alignment** in `SpeechResponse` — reel caption highlighting degrades.
7. **Inefficient WAV encode** — `String.fromCharCode` loop + base64 data URI;
   should return a `Blob` URL (`audio/wav`) instead.

Adjacent gaps:

- `SpeechConfigSchema.settings` (`account/schema.ts:36-47`) has `speed`/
  `language` but not Kokoro's `voice` key (top-level `voice_id` covers the
  common path; the settings key would be dropped on save).
- `vite.config.ts` has no `optimizeDeps.exclude` for
  `kokoro-js`/`@huggingface/transformers` — Vite pre-bundling of onnxruntime-web
  is a known source of wasm-loading breakage; verify in dev.
- COOP/COEP (`require-corp`) is already set globally (for WebLLM). Transformers
  fetches weights via CORS `fetch`, which HF serves with CORS headers, so this
  should work — but must be verified under the deployed headers.

## Privacy mode: what "everything in browser" needs

Cloud-dependent features today, and their local answer:

| Feature | Today | In-browser path |
|---|---|---|
| Speak (Talk, phrases, notes) | ElevenLabs/Gemini/browser | **Kokoro** (this work) |
| Live streaming speak | ElevenLabs WS only | Kokoro `stream()` → `PcmStreamPlayer(24000, sinkId)` |
| Suggestions / phrase seeding / space context | Gemini/OpenRouter via `useGenerate` | **WebLLM already exists** (`@built-in-ai/web-llm`, "Browser AI (Local)" in `ai/lib/registry.ts`); privacy onboarding currently just disables suggestions |
| Transcription (STT) | Gemini/OpenRouter multimodal | Whisper via Transformers.js (e.g. `whisper-base` ~73 MB, WebGPU/wasm) — new local provider in `use-transcribe.ts`; **not yet started** |
| Reel export voice-over | ElevenLabs REST required (`notes/components/note-reel-export-panel.tsx`) | Allow Kokoro; captions need alignment strategy (timestamped model or per-chunk fallback) |
| Slide voice-over | `generateSpeech` (any provider) | Works with Kokoro as-is (IndexedDB-cached) |
| Voice cloning / similar voices | ElevenLabs only | **No local equivalent** — hide in privacy mode |
| Autocomplete, storage, settings | Already local (static assets, IndexedDB) | Nothing to do |

One honest caveat for the privacy-mode copy: Kokoro/WebLLM/Whisper weights are
**downloaded once from a CDN** (no user data ever sent). Either keep the copy
accurate ("a one-time voice download; your words never leave this device") or
self-host weights under our own origin to make it fully first-party.

Offline: no service worker exists. Model weights survive offline via the
Transformers.js Cache API cache, but the app shell doesn't — full offline PWA
is a separate, optional workstream (`vite-plugin-pwa`).

## Proposed phases

### Phase 1 — Make the Kokoro provider production-grade
- Bump model id to `onnx-community/Kokoro-82M-v1.0-ONNX`; reconcile voice list
  with the v1.0 set.
- Device/dtype selection: `navigator.gpu` + adapter check → `webgpu`/`fp32`,
  else `wasm`/`q8`.
- Move load + inference into a module Web Worker; provider talks to it via
  postMessage. (Precedent: WebLLM runs in-page today; worker keeps Talk usable
  during synthesis.)
- Wire `progress_callback` → download progress state → `<LoadingState>` /
  `<Callout tone="warning">` in speech settings and first-speak UX.
- Return Blob URLs instead of base64 data URIs.
- Add `voice` to `SpeechConfigSchema` kokoro settings; update `speech/README.md`.
- Verify Vite dev/prod wasm loading under COOP/COEP; add
  `optimizeDeps.exclude` if needed.

### Phase 2 — Streaming speak
- Implement `generateSpeechStream` on `KokoroSpeechProvider` using
  `TextSplitterStream`; feed Float32→Int16 chunks into the existing
  `PcmStreamPlayer(24000, selectedOutputDeviceId)` (`use-speech.ts:166-218`
  already has the hook shape; today it's ElevenLabs-only).

### Phase 3 — Privacy-mode wiring
- `buildPrivacyModeUpdate()` (`onboarding/lib/setup-modes.ts:79`): offer/default
  Kokoro with browser-speech fallback; update `SETUP_MODES` privacy copy to
  mention the one-time voice download.
- Settings: keep Kokoro visible without keys (already true); polish first-run
  download flow.
- Hide voice cloning entry points when provider is kokoro/browser.

### Phase 4 — Feature parity in privacy mode
- Reel export: accept Kokoro; alignment via timestamped model (investigate
  kokoro-js support) or per-sentence caption fallback.
- Local STT: Whisper provider behind `use-transcribe.ts`.
- Suggestions: let privacy onboarding opt into WebLLM instead of hard-disabling.
- Optional: self-host weights; optional PWA for full offline.

## Open questions

1. Does kokoro-js expose the timestamped ONNX export (word alignment), or do we
   estimate caption timing from chunk durations?
2. Privacy-mode default: Kokoro (86 MB download, natural voice) vs browser
   speech (instant, robotic) — download-on-choice or upgrade prompt later?
3. Self-host weights vs HF CDN for v1?
4. wasm performance floor on low-end devices — need a real-device test before
   making Kokoro the privacy default.

## Sources

- https://www.npmjs.com/package/kokoro-js
- https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
- https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX-timestamped
- https://huggingface.co/posts/Xenova/620657830533509 (WebGPU announcement)
- https://github.com/rhulha/StreamingKokoroJS (streaming reference impl)
- https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/ (Safari 26 WebGPU)
