# @september/speech

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
} from '@september/speech';
import type { UseSpeechReturn, VoiceSettingsFormData } from '@september/speech';
```

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

Unified settings form. Renders provider cards, model select, voice search + list, per-provider advanced sliders, and an inline Save button. Driven by `useVoiceSettings` internally.

```tsx
<SpeechSettings account={account} onSubmit={async (data) => { /* persist */ }} />
```

Props: `{ account: Account; onSubmit: (data: VoiceSettingsFormData) => Promise<void> }`.

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
