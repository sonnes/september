# Audio Module

This module handles audio playback and storage for the September app.

## Features

- **Audio Player**: Context-based audio player with queue support, playback control, and time tracking.
- **Text Viewer**: Specialized component for visualizing audio alignment through text highlighting.
- **Audio Storage**: Abstracted storage for audio files using Supabase or Triplit.
- **Audio Service**: Low-level service for interacting with Supabase storage.

## Components

- `AudioPlayerProvider`: Context provider for audio playback.
- `AudioProvider`: Context provider for audio storage selection.
- `TextViewer`: Component that synchronizes text highlighting with audio playback.
- `TextViewerWords`: Component that renders the highlighted words.

## Hooks

### Storage Hooks
- `useAudio`: Access the audio storage context (provider-agnostic).
- `useUploadAudioTriplit`: Direct access to Triplit-based audio upload.
- `useDownloadAudioTriplit`: Direct access to Triplit-based audio download.
- `useUploadAudioSupabase`: Direct access to Supabase-based audio upload.
- `useDownloadAudioSupabase`: Direct access to Supabase-based audio download.

### Playback Hooks
- `useAudioPlayer`: Access the audio player context.
- `useTextViewer`: Access the text viewer context for alignment-based highlighting.

## Usage

### Playback

```tsx
import { AudioPlayerProvider, useAudioPlayer } from '@/packages/audio';

function Player() {
  const { enqueue, isPlaying, togglePlayPause } = useAudioPlayer();
  
  const playTrack = () => {
    enqueue({ blob: 'base64-data...' });
  };

  return <button onClick={togglePlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>;
}
```

### Storage

```tsx
import { AudioProvider, useAudio } from '@/packages/audio';

function Uploader() {
  const { uploadAudio } = useAudio();
  
  const handleUpload = async () => {
    await uploadAudio({ path: 'path/to/audio.mp3', blob: 'base64...' });
  };

  return <button onClick={handleUpload}>Upload</button>;
}
```

