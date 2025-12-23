# Speech Module

This module provides text-to-speech capabilities for the September app.

## Features

- **Multiple Providers**: Supports Browser TTS, ElevenLabs, and Gemini Speech.
- **Speech Context**: Manages speech generation and voice listing across the app.
- **Settings & Configuration**: Forms and modals to configure speech providers and voices.

## Components

- `SpeechProvider`: Context provider for speech services.
- `SpeechSettingsForm`: Form to configure speech settings.
- `VoicesForm`: Form to select and search for voices.
- `SpeechSettingsModal`: A modal to quickly update speech settings.

## Hooks

### Core Hooks

- `useSpeech`: Access low-level speech services.
- `useSpeechContext`: Access speech services within a provider.

### Voice & Model Hooks

- `useVoiceFetching(provider, apiKey)`: Fetch available voices for a specific provider.
- `useProviderModels(provider)`: Get available models for a specific provider.
- `useVoiceSettings()`: Manage voice selection form state and submission.

## Usage

### Basic Speech Generation

```tsx
import { SpeechProvider, useSpeechContext } from '@/packages/speech';

function App() {
  return (
    <SpeechProvider>
      <SpeakButton />
    </SpeechProvider>
  );
}

function SpeakButton() {
  const { generateSpeech } = useSpeechContext();

  const handleSpeak = async () => {
    await generateSpeech('Hello world');
  };

  return <button onClick={handleSpeak}>Speak</button>;
}
```

### Voice Selection

```tsx
import { useProviderModels, useVoiceFetching } from '@/packages/speech';

function VoiceSelector({ provider, apiKey }) {
  const { voices, isLoading: voicesLoading } = useVoiceFetching(provider, apiKey);
  const { models, isLoading: modelsLoading } = useProviderModels(provider);

  if (voicesLoading || modelsLoading) return <div>Loading...</div>;

  return (
    <select>
      {voices.map(voice => (
        <option key={voice.id} value={voice.id}>
          {voice.name}
        </option>
      ))}
    </select>
  );
}
```
