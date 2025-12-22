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

- `useVoiceStorage`: Hook for managing voice samples in Triplit.
- `useRecording`: Context hook for recording state and actions.
- `useUpload`: Context hook for upload state and actions.

## Context

- `RecordingProvider`: Provider for the recording context.
- `UploadProvider`: Provider for the upload context.

## Services

- `ElevenLabsVoiceClone`: Service class for interacting with the ElevenLabs voice cloning API.

## Usage

```tsx
import { VoiceCloneForm, RecordingProvider, UploadProvider } from '@/packages/cloning';

export function ClonePage() {
  return (
    <UploadProvider>
      <RecordingProvider>
        <VoiceCloneForm />
      </RecordingProvider>
    </UploadProvider>
  );
}
```

