# Audio Module

Assistive audio playback, text-alignment visualization, and local storage for the September app.

## Public API

### Player

```tsx
import { AudioPlayerProvider, useAudioPlayer } from '@september/audio';
```

Wrap your tree with `AudioPlayerProvider`. `useAudioPlayer()` returns:

| Field                           | Type                     | Description                                                                       |
| ------------------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| `isPlaying`                     | `boolean`                | True while a track is playing                                                     |
| `enqueue(track)`                | `(track: Audio) => void` | Append to queue; starts immediately if empty; no-op while muted                   |
| `togglePlayPause()`             | `() => void`             | Pause / resume current track                                                      |
| `current`                       | `Audio \| null`          | Currently playing track                                                           |
| `isMuted`                       | `boolean`                | Mute state                                                                        |
| `toggleMute()`                  | `() => void`             | Toggle mute                                                                       |
| `currentTime`                   | `number`                 | Playback position in seconds (RAF-based, ~16ms granularity)                       |
| `duration`                      | `number`                 | Current track duration in seconds                                                 |
| `seek(time)`                    | `(time: number) => void` | Seek to position                                                                  |
| `outputDevices`                 | `MediaDeviceInfo[]`      | Enumerated audio output devices (excludes default/communications)                 |
| `isDeviceSelectionSupported`    | `boolean`                | Whether `setSinkId` is available                                                  |
| `selectedOutputDeviceId`        | `string \| null`         | Active device id, persisted to `localStorage` key `september:audio-output-device` |
| `setSelectedOutputDeviceId(id)` | `(id: string) => void`   | Select output device + persist                                                    |
| `refreshOutputDevices()`        | `() => Promise<void>`    | Re-enumerate devices                                                              |

`Audio` tracks can be either blob-based (`blob: string` — base64 with optional `data:` prefix) or utterance-based (`utterance: SpeechSynthesisUtterance`).

### Device selector UI

```tsx
import { AudioOutputDeviceSelector } from '@september/audio';
```

Renders a `<Select>` for choosing the audio output device. Returns `null` when device selection is unsupported or no devices are enumerated.

### Viewers

```tsx
import { TextViewer, TextViewerWords } from '@september/audio';
import { ReelRenderer, ReelTextViewer } from '@september/audio';
```

- **`TextViewer`** — container component that syncs text highlighting with `useAudioPlayer` context. Wrap `TextViewerWords` inside it.
- **`TextViewerWords`** — renders word spans with `spoken` / `current` / `unspoken` data attributes.
- **`ReelTextViewer`** — full-screen reel layout. Accepts `alignment + currentTime + duration` for standalone sync, or alignment alone to sync via `AudioPlayerProvider` context, or neither for static display.
- **`ReelRenderer`** — low-level responsive text renderer using `@chenglou/pretext` for binary-search font sizing.

### Hooks

```tsx
import { useTextViewer } from '@september/audio';
```

`useTextViewer({ alignment, currentTime, duration? })` returns `{ segments, words, spokenSegments, unspokenSegments, currentWord, seekToWord }` for custom alignment rendering.

### Storage

Plain async functions — no context, no class. Throw on failure.

```tsx
import {
  deleteAudio,
  downloadAudio,
  getAudio,
  listAudio,
  uploadAudio,
  uploadAudioBinary,
} from '@september/audio';
```

| Function            | Signature                                                                                       | Notes                                          |
| ------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `uploadAudioBinary` | `({ path, blob: Blob \| ArrayBuffer, contentType?, metadata? }) => Promise<string>`             | Preferred for binary data (no base64 overhead) |
| `uploadAudio`       | `({ path, blob: string, alignment?, contentType?, metadata? }) => Promise<string \| undefined>` | Legacy path for base64 TTS callers             |
| `downloadAudio`     | `(path) => Promise<Blob>`                                                                       | Throws if not found                            |
| `getAudio`          | `(path) => Promise<{ blob, alignment? } \| null>`                                               | Returns null if not found                      |
| `deleteAudio`       | `(path) => Promise<void>`                                                                       |                                                |
| `listAudio`         | `(prefix) => Promise<Array<{ name, created_at, metadata }>>`                                    | Scans by key prefix                            |

#### Storage data layout

IndexedDB database: `september-audio`, object store: `audio-files`.

Each entry is keyed by path and stores `{ blob: ArrayBuffer, contentType, metadata, created_at, name }`.

### Types

```tsx
import type { Alignment, Audio } from '@september/audio';
```

- **`Audio`** — playable track: `{ id?, text?, path?, blob?, alignment?, duration?, utterance? }`
- **`Alignment`** — character-level timing: `{ characters: string[], start_times: number[], end_times: number[] }`

## Internal modules (not exported from index)

| Module                        | Purpose                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| `hooks/use-pretext-layout.ts` | Binary-search font sizing via `@chenglou/pretext`                                           |
| `components/reel.tsx`         | Also exports `ReelOverlay` / `ReelSyncOverlay` for internal use                             |
| `types/index.ts`              | Only `Audio` and `Alignment` — `CharacterAlignment` lives privately in `use-text-viewer.ts` |
