# Cloning Module

This module provides functionality for voice cloning, specifically using the ElevenLabs API. It includes components for uploading audio files, recording voice samples, and a form to submit these samples for cloning.

## Features

- **Audio Upload**: Upload existing audio files for voice cloning.
- **Voice Recording**: Record voice samples directly in the browser using pre-defined sample texts.
- **ElevenLabs Integration**: Integration with the ElevenLabs API for creating voice clones.
- **Local Storage**: Voice samples are stored locally using Triplit before being uploaded to ElevenLabs.

## Components

- `VoiceCloneForm`: The main form for voice cloning, integrating upload and recording sections.
- `RecordingSection`: Component for recording voice samples.
- `UploadSection`: Component for uploading audio files.

## Hooks

### Core Hooks

- `useRecording`: Main hook for recording voice samples (composes smaller hooks).
- `useUpload`: Manage audio file uploads for cloning.
- `useVoiceStorage`: Manage voice samples in Triplit database.

### Specialized Hooks

- `useMediaRecorder`: Low-level MediaRecorder API wrapper.
- `useAudioPlayback`: Manage playback of recorded samples.
- `useRecordingState`: Manage the state of multiple recording samples.

## Usage

### Recording Voice Samples

```tsx
import { RecordingProvider, useRecordingContext } from '@/packages/cloning';

function Recorder() {
  const { startRecording, stopRecording, status } = useRecordingContext();

  return (
    <div>
      <p>Status: {status}</p>
      <button onClick={startRecording}>Start</button>
      <button onClick={stopRecording}>Stop</button>
    </div>
  );
}
```
