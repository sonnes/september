# @september/cloning

Voice cloning for September using the ElevenLabs API. Users upload existing audio or record new samples directly in the browser, then submit them to ElevenLabs to create a personal voice clone.

## Public API

### Form component

```tsx
import { VoiceCloneForm } from '@september/cloning';

// Self-contained — no provider needed. Calls useUpload and useRecording internally.
<VoiceCloneForm />
```

### ElevenLabs functions

```ts
import { cloneVoice, findSimilarVoices } from '@september/cloning';

const result = await cloneVoice(apiKey, { files, name, description });
// result: { voice_id: string; name: string }

const voices = await findSimilarVoices(apiKey, files);
// voices: SimilarVoice[]
```

### Sample storage

Plain async functions — pass `userId` explicitly, no hook required.

```ts
import { uploadVoiceSample, getVoiceSamples, deleteVoiceSample, downloadVoiceSample } from '@september/cloning';

const path = await uploadVoiceSample({ userId, file, type: 'upload' });
const samples = await getVoiceSamples(userId, 'recording'); // or omit type for all
const blob = await downloadVoiceSample(path);
await deleteVoiceSample(path);
```

Sample paths follow the scheme: `voice-samples/{userId}/{type}/{filename}`

### Types

```ts
import type { VoiceSample, UploadStatus, RecordingStatus, SimilarVoice } from '@september/cloning';
```

## Architecture

No context providers. Each hook owns its own state and calls the plain storage functions directly.

- `useUpload` — uploaded file list; calls `uploadVoiceSample`/`deleteVoiceSample`/`getVoiceSamples`.
- `useRecording` — composites `useMediaRecorder` + `useAudioPlayback`; calls storage functions for save/delete/download.
- `useMediaRecorder` — wraps `MediaRecorderManager` (plain TS class, no React) in React state.
- `useAudioPlayback` — plays recordings, owns the `URL.createObjectURL`/`revokeObjectURL` lifecycle.

`MediaRecorderManager` uses an exclusive mic model: starting a new recording stops all active ones first. `stopAll()` is called on unmount to release the microphone.

## Utilities

- `collectSampleIds(uploadedFiles, recordings)` — merges upload IDs and recording IDs, de-duplicates.
- `MediaRecorderManager` — testable plain-TS recorder lifecycle class.
