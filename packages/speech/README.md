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

- `useSpeech`: Access low-level speech services.
- `useSpeechContext`: Access speech services within a provider.

## Usage

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

