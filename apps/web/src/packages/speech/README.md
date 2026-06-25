# @/packages/speech

Text-to-speech for September. Manages engine registry, voice listing, and the unified settings UI.

## Public API

```ts
import {
  SpeechProvider,
  useSpeechContext,
  SpeechSettings,
  SpeechSettingsModal,
  VoicesList,
  useSpeech,
} from '@/packages/speech';
import type { UseSpeechReturn, VoiceSettingsFormData } from '@/packages/speech';
```

`SpeechSettings` is a standalone form component — it does **not** require a Dialog wrapper and can be embedded directly in any layout (e.g., a side panel tab). The `SpeechSettingsModal` wraps it in a Dialog for the current chat page; both exports coexist.

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
path (ElevenLabs only). It opens a stream-input WebSocket, plays decoded PCM
chunks live as they arrive (so audio starts on the first chunk instead of after
the full file), and resolves with the complete WAV blob + merged alignment for
persistence/replay — the same `SpeechResponse` shape as `generateSpeech`. Returns
`undefined` when the active provider has no streaming path, and rejects (after
stopping live playback) on WS failure, so callers fall back to `generateSpeech`.
Live playback honours the output device selected in `AudioPlayerProvider` (the
PCM context is routed via `setSinkId`), matching buffered `<audio>` playback.
Talk's send flow uses it; note voice-over and reel export stay on REST.

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
  };
}
```

## Providers (internal)

| Provider     | API key required | Notes                               |
| ------------ | ---------------- | ----------------------------------- |
| `browser`    | No               | Web Speech API                      |
| `kokoro`     | No               | On-device via WebGPU, ~160MB model  |
| `elevenlabs` | Yes              | High-quality voices                 |
| `gemini`     | Yes              | Google AI voices                    |
