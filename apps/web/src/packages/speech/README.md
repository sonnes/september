# @/packages/speech

Text-to-speech for September. Manages engine registry, voice listing, and the unified settings UI.

## Public API

```ts
import {
  KokoroModelCard,
  SpeechProvider,
  SpeechSettings,
  SpeechSettingsModal,
  VoicesList,
  paginateVoices,
  sortClonedFirst,
  useSpeech,
  useSpeechContext,
  useVoiceFetching,
} from '@/packages/speech';
import type { UseSpeechReturn, VoicePage, VoiceSettingsFormData } from '@/packages/speech';
```

`SpeechSettings` is a standalone form component — it does **not** require a Dialog wrapper and can be embedded directly in any layout (e.g., a side panel tab). The `SpeechSettingsModal` wraps it in a Dialog for the current chat page; both exports coexist. The unified **Voice** page (`/voice`) composes its own autosaving picker from `VoicesList`, `KokoroModelCard`, `useVoiceFetching`, and the `paginateVoices`/`sortClonedFirst` list helpers instead of using `SpeechSettings`.

`sortClonedFirst(voices)` returns a stable copy with cloned voices first; `paginateVoices(voices, page, pageSize)` returns a `VoicePage` (`{ items, page, pageCount, total }`) with the 1-based `page` clamped into range. Both are pure helpers in `lib/paginate.ts`.

Everything else — hooks, providers, schemas — is internal.

## Components

### `SpeechProvider`

Context provider. Wrap any tree that needs speech generation or voice listing.

```tsx
<SpeechProvider>
  <App />
</SpeechProvider>
```

### `useSpeechContext`

Access speech services inside a `SpeechProvider`.

```tsx
const { generateSpeech, listVoices, getProvider } = useSpeechContext();
await generateSpeech('Hello world');
```

### `SpeechSettings`

Unified settings form, organized into three sections — **Provider** (provider cards), **Voice** (model select + voice search/list), and **Speech** (per-provider advanced sliders) — above an always-visible inline Save button. Driven by `useVoiceSettings` internally.

By default the three sections render under a segmented tab bar (Voice selected first); field values persist across tab switches (the form does not unregister unmounted inputs). Pass `section` to render a single section's body **without** the tab bar — the chat side panel uses this to promote Provider/Voice/Speech to top-level panels. Keep the same `SpeechSettings` element mounted while only changing `section` so the shared form state survives section switches.

```tsx
// Tabbed (modal, settings page)
<SpeechSettings account={account} onSubmit={async (data) => { /* persist */ }} />

// Single section, no tab bar (chat side panel)
<SpeechSettings account={account} onSubmit={save} section="provider" />
```

Props: `{ account: Account; onSubmit: (data: VoiceSettingsFormData) => Promise<void>; section?: 'provider' | 'voice' | 'speech' }`.

The `<form>` has `id="speech-settings-form"` so external submit buttons can target it.

### `SpeechSettingsModal`

Trigger button + Dialog wrapping `SpeechSettings`. Reads and writes `account.ai_speech` directly via `useAccount`. Persists the full union: `{ provider, voice_id, voice_name, model_id, settings }`.

```tsx
<SpeechSettingsModal />
```

Requires a `SpeechProvider` ancestor (present in `chats/[id]/layout.tsx` and `talk/layout.tsx`).

### `VoicesList`

Read-only voice list for selecting a voice. Used by onboarding's speech step and internally by `SpeechSettings`.

```tsx
<VoicesList voices={voices} selectedVoiceId={id} onSelectVoice={handleSelect} />
```

## Hook

### `useSpeech`

Low-level engine registry. Returns `{ generateSpeech, listVoices, getProviders, getProvider }`.

`generateSpeech(text, options?, context?)` accepts an optional `context.previous_text` —
the utterance that came before this one. It is forwarded to the engine as
`SpeechRequest.previous_text` for prosodic continuity and is **only** used by the
ElevenLabs provider (others ignore it). It is contextual, not voiced. Talk spaces
pass the prior message's text so consecutive utterances flow naturally.

`generateSpeechStream(text, options?, context?)` is the **low-latency streaming**
path (ElevenLabs and Kokoro). ElevenLabs streams over a stream-input WebSocket;
Kokoro streams sentence chunks from its local worker. Either way decoded PCM
chunks play live as they arrive (so audio starts on the first chunk instead of
after the full file), and the promise resolves with the complete WAV blob +
alignment for persistence/replay — the same `SpeechResponse` shape as
`generateSpeech`. Returns `undefined` when the active provider has no streaming
path, and rejects (after stopping live playback) on failure, so callers fall
back to `generateSpeech`. Live playback honours the output device selected in
`AudioPlayerProvider` (the PCM context is routed via `setSinkId`), matching
buffered `<audio>` playback. Talk's send flow uses it; note voice-over and reel
export stay on REST. The `VITE_DISABLE_WS_TTS` kill switch only disables the
ElevenLabs socket path — Kokoro streaming is unaffected.

### Metering

Both paths run through `meterSpeech` (`lib/meter.ts`), which records one event per call —
provider, model, characters sent, latency, and success — and returns the original promise so
rejections still reach the callers that fall back to REST. Speech providers bill on characters,
which the caller always knows, so no provider response is needed.

The recorded provider is the configured one (`elevenlabs`, `gemini`, `kokoro`, `browser`), not
always ElevenLabs; `speechModelId` fills in each engine's default model when settings do not name
one. ElevenLabs characters become prepaid credits at the model's rate, so its calls carry credits
rather than dollars — see `@/packages/usage`.

### Kokoro (on-device TTS, internal)

`KokoroSpeechProvider` runs the Kokoro-82M v1.0 model
(`onnx-community/Kokoro-82M-v1.0-ONNX`, via kokoro-js) entirely in the browser:

- **Worker**: model load + inference live in a module Web Worker
  (`lib/providers/kokoro-worker.ts`) so synthesis never blocks the UI. One
  worker/model per app — module-level singleton, since `useSpeech` recreates
  provider instances.
- **Backend**: WebGPU + `fp32` when an adapter is available, else WASM + `q8`
  (`pickKokoroBackend`); a WebGPU load failure retries once on WASM.
- **Download**: ~86 MB (WASM) / ~326 MB (WebGPU), fetched once from the
  Hugging Face CDN and cached by Transformers.js in the browser Cache API.
  `preloadKokoro()` starts the download ahead of the first utterance (privacy
  onboarding calls it); `useKokoroModelStatus()` exposes
  `idle | loading(progress) | ready(device) | error` for UI
  (`KokoroModelCard` in the speech settings renders it).
- **Alignment**: Kokoro returns no timing, so the provider estimates a
  character alignment from each chunk's text + audio duration
  (`estimateAlignment`) — coarse but sufficient for reel captions.
- **Output**: 24 kHz mono; buffered responses are WAV data URIs built with the
  shared `pcmToWavDataUri`.

Kokoro is available only in the web build. Tauri builds replace the Kokoro runtime
module and omit the provider from the shared AI registry, which keeps its worker and
model runtime out of the desktop bundle.

### ElevenLabs WebSocket streaming (internal)

`stream-input` endpoint: `wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input`.

- **Auth**: browser WebSockets can't set headers, so `xi-api-key` is sent in the
  first (BOS) message body. The API key is already used client-side, so no
  server is involved.
- **Format**: PCM (`pcm_22050` default) — each chunk is raw samples, trivially
  schedulable in Web Audio (MP3 chunks aren't independently decodable).
- **Message sequence**: BOS `{ text: " ", voice_settings, "xi-api-key",
previous_text? }` → text `{ text: "<sentence> " }` → EOS `{ text: "" }`. The
  server streams `{ audio, alignment }` chunks then `{ isFinal: true }`.
- **Warm socket** (`ElevenLabsWsConnection`): one socket is pre-opened so each
  speak skips the handshake. Sockets are single-use (server closes after EOS),
  so `acquire` hands out the warm socket and pre-opens the next. It health-checks
  (`readyState === OPEN`, else reopen), sets `inactivity_timeout=120`, and drops
  a stale socket on window `focus`/`visibilitychange` so a backgrounded tab
  reconnects cleanly. Shared as a module singleton across `useSpeech` instances.

## `account.ai_speech` data shape

```ts
{
  provider: 'browser' | 'gemini' | 'elevenlabs' | 'kokoro';
  voice_id?: string;
  voice_name?: string;
  model_id?: string;
  settings?: {
    // Browser
    speed?: number;        // 0.5–2.0
    pitch?: number;        // -20–20
    volume?: number;       // 0–1
    // ElevenLabs
    stability?: number;    // 0–1
    similarity?: number;   // 0–1
    style?: number;        // 0–1
    speaker_boost?: boolean;
    // Kokoro
    language?: string;     // 'en-us' | 'en-gb'
    voice?: string;        // Kokoro voice id fallback (voice_id wins)
  };
}
```

## Providers (internal)

| Provider     | API key required | Notes                                |
| ------------ | ---------------- | ------------------------------------ |
| `browser`    | No               | Web Speech API                       |
| `kokoro`     | No               | Web only; on-device (WebGPU or WASM) |
| `elevenlabs` | Yes              | High-quality voices                  |
| `gemini`     | Yes              | Google AI voices                     |
