# Cloning Module

Voice cloning for the September app using the ElevenLabs API. Users can upload existing audio or record new samples directly in the browser, then submit them to ElevenLabs to create a personal voice clone.

## Features

- **Audio Upload**: Upload existing audio files (WAV, MP3, M4A up to 25 MB) for voice cloning.
- **Voice Recording**: Record voice samples directly in the browser using pre-defined sentence prompts.
- **ElevenLabs Integration**: Submits samples to the ElevenLabs Instant Voice Cloning API.
- **Local Storage**: Voice samples are stored locally in IndexedDB, then sent directly to ElevenLabs at clone time. Local samples are cleaned up after a successful clone.
- **Merged sources**: Both uploaded files and recorded samples are always sent together — more data → better clone quality.

## Architecture

All state is hoisted into a single `CloningProvider` that creates one shared `AudioService` instance (one IndexedDB connection, one set of mount-effects). Child hooks receive the shared storage via props.

```
CloningProvider
  ├── VoiceStorageContext  (single AudioService / IndexedDB)
  ├── UploadContext        (useUploadLogic)
  └── RecordingContext     (useRecording → MediaRecorderManager)
```

`MediaRecorderManager` (`lib/media-recorder-manager.ts`) is a plain TS class — no React — that holds a `Map<id, {recorder, stream}>`. It stops individual recordings by ID, and calls `stopAll()` on unmount via `useEffect` cleanup, releasing the microphone correctly on navigation.

`useAudioPlayback` owns the `URL.createObjectURL` / `URL.revokeObjectURL` lifecycle. All blob URLs are revoked on `ended`, `error`, or `stopPlaying`.

## Components

- `VoiceCloneForm`: Main form — tabs for upload vs. record, voice details, submit.
- `RecordingSection`: Carousel of 10 sample sentences with record/stop/play/delete per sample.
- `UploadSection`: Drag-and-drop / file picker for audio uploads.
- `CloningProvider`: Context provider — wrap any usage of the above components.

## Hooks

- `useRecording` — composes `useMediaRecorder`, `useAudioPlayback`, `useRecordingState`.
- `useUploadLogic` — manages uploaded file list.
- `useVoiceStorage` — IndexedDB CRUD via `@september/audio/AudioService`.
- `useMediaRecorder` — wraps `MediaRecorderManager` in React state.
- `useAudioPlayback` — plays recordings, owns URL lifetime.
- `useRecordingState` — persists recorded sample IDs.

## Utilities

- `collectSampleIds(uploadedFiles, recordings)` — merges both sources, de-duplicates.
- `MediaRecorderManager` — testable plain-TS class for recorder lifecycle. Mic is exclusive: starting a new recording stops all active ones first. `stopAll()` is called on unmount to release the microphone.
- `ElevenLabsVoiceClone` — fetch wrapper for `/v1/voices/add` (clone) and `/v1/voices/similar` (similarity search).

## Usage

```tsx
import { CloningProvider, VoiceCloneForm } from '@september/cloning';

export default function ClonePage() {
  return (
    <CloningProvider>
      <VoiceCloneForm />
    </CloningProvider>
  );
}
```
