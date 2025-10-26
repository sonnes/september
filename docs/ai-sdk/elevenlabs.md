# ElevenLabs Integration

## Overview

ElevenLabs is NOT part of the standard AI SDK. It's integrated directly via their REST API for text-to-speech functionality.

## Current Implementation

September currently uses ElevenLabs via direct API calls in [`services/elevenlabs/index.ts`](../../services/elevenlabs/index.ts).

## Configuration

```typescript
interface ElevenLabsConfig {
  apiKey: string;
  baseUrl?: string; // Default: 'https://api.elevenlabs.io/v1'
}
```

## Usage Pattern

### Text-to-Speech

```typescript
const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/{voice_id}', {
  method: 'POST',
  headers: {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Hello, world!',
    model_id: 'eleven_turbo_v2_5',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  }),
});

const audioBuffer = await response.arrayBuffer();
```

### Voice Cloning

```typescript
const formData = new FormData();
formData.append('name', 'My Voice');
formData.append('files', audioFile);

const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
  method: 'POST',
  headers: {
    'xi-api-key': apiKey,
  },
  body: formData,
});

const { voice_id } = await response.json();
```

## Models

| Model ID | Description | Latency |
|----------|-------------|---------|
| `eleven_turbo_v2_5` | Fastest, high quality | ~300ms |
| `eleven_multilingual_v2` | 29 languages | ~500ms |
| `eleven_monolingual_v1` | English only, highest quality | ~600ms |

## Storage in Account

Based on [`ai-config-storage.md`](../specs/ai-config-storage.md):

```typescript
interface SpeechConfig {
  enabled: boolean;
  provider: 'elevenlabs' | 'gemini' | 'browser';
  voiceId?: string; // ElevenLabs voice ID
  settings?: {
    stability?: number;      // 0-1
    similarity_boost?: number; // 0-1
    style?: number;         // 0-1
    use_speaker_boost?: boolean;
  };
}

interface ProviderConfig {
  elevenLabs?: {
    apiKey: string;
    baseUrl?: string;
  };
}
```

## September Integration

### Configuration Flow

1. User sets ElevenLabs API key → stored in `account.ai_providers.elevenLabs.apiKey`
2. User selects voice → stored in `account.ai_speech.voiceId`
3. User configures settings → stored in `account.ai_speech.settings`

### Service Layer

```typescript
// services/speech/elevenlabs.ts
class ElevenLabsSpeechService {
  constructor(
    private apiKey: string,
    private voiceId: string,
    private settings: ElevenLabsSettings
  ) {}

  async synthesize(text: string): Promise<ArrayBuffer> {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: this.settings,
        }),
      }
    );

    return response.arrayBuffer();
  }
}
```

## AI SDK Future Support

As of January 2025, ElevenLabs is not in the core AI SDK. Possible future integration:

1. **Community Provider**: Check for `@ai-sdk/elevenlabs` (community package)
2. **Custom Provider**: Implement AI SDK provider interface
3. **Direct Integration**: Continue using direct API calls (current approach)

## Recommendation

**Keep direct API integration** for ElevenLabs because:
- Not part of standard AI SDK
- TTS is fundamentally different from text generation
- Direct API provides more control over audio settings
- No overhead from provider abstraction
