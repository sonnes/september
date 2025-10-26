# AI SDK Integration with September Features

## Data Model Compatibility

### Current Schema → AI SDK Mapping

```typescript
// From ai-config-storage.md
interface BaseFeatureConfig {
  enabled: boolean;
  provider: AIProvider;
  model?: string;           // ✅ Maps to AI SDK model ID
  settings?: Record<string, unknown>; // ✅ Maps to AI SDK options
}
```

**Compatibility: ✅ Fully Compatible**

The current data model is designed to work seamlessly with AI SDK:

| Field | AI SDK Mapping | Notes |
|-------|----------------|-------|
| `provider` | Provider selection | `'gemini'` → `@ai-sdk/google` |
| `model` | Model ID string | `'gemini-2.5-flash-lite'` |
| `settings.temperature` | `temperature` param | Direct mapping |
| `settings.maxSuggestions` | Custom logic | Post-processing |
| `settings.contextWindow` | `messages` array | Build context |

### Provider Credentials

```typescript
// From ai-config-storage.md
interface ProviderConfig {
  gemini?: {
    apiKey: string;     // ✅ Used in createGoogleGenerativeAI()
    baseUrl?: string;   // ✅ Used in createGoogleGenerativeAI()
  };
}
```

**Compatibility: ✅ Fully Compatible**

## Feature Integration

### 1. AI Suggestions

**Current Storage:**
```typescript
account.ai_suggestions = {
  enabled: true,
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
  settings: {
    temperature: 0.7,
    maxSuggestions: 5,
    contextWindow: 10,
    systemInstructions: 'Custom prompt...',
  },
};
```

**AI SDK Implementation:**
```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

async function generateSuggestions(
  config: SuggestionsConfig,
  apiKey: string,
  userInput: string,
  recentMessages: Message[]
) {
  // Build context from recent messages
  const contextMessages = recentMessages
    .slice(-config.settings.contextWindow)
    .map(msg => ({
      role: 'user',
      content: msg.content,
    }));

  const result = await generateText({
    model: google(config.model, { apiKey }),
    system: config.settings.systemInstructions,
    messages: [
      ...contextMessages,
      { role: 'user', content: userInput },
    ],
    temperature: config.settings.temperature,
    maxOutputTokens: 100,
  });

  // Parse and limit suggestions
  const allSuggestions = result.text.split('\n').filter(Boolean);
  return allSuggestions.slice(0, config.settings.maxSuggestions);
}
```

**Using Structured Output:**
```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: google(config.model, { apiKey }),
  schema: z.object({
    suggestions: z.array(z.string()).max(config.settings.maxSuggestions),
  }),
  system: config.settings.systemInstructions,
  prompt: userInput,
  temperature: config.settings.temperature,
});

return object.suggestions;
```

### 2. AI Transcription

**Current Storage:**
```typescript
account.ai_transcription = {
  enabled: true,
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  settings: {
    language: 'en-US',
    detectLanguage: true,
    includeTimestamps: false,
  },
};
```

**AI SDK Implementation:**
```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

async function transcribeAudio(
  config: TranscriptionConfig,
  apiKey: string,
  audioBuffer: ArrayBuffer
) {
  const result = await generateText({
    model: google(config.model, { apiKey }),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: config.settings.detectLanguage
              ? 'Transcribe this audio in its original language:'
              : `Transcribe this audio in ${config.settings.language}:`,
          },
          {
            type: 'file',
            data: audioBuffer,
            mimeType: 'audio/wav',
          },
        ],
      },
    ],
  });

  return result.text;
}
```

### 3. Text-to-Speech (ElevenLabs)

**Current Storage:**
```typescript
account.ai_speech = {
  enabled: true,
  provider: 'elevenlabs',
  voiceId: 'voice_123',
  settings: {
    stability: 0.5,
    similarity_boost: 0.75,
  },
};
```

**Direct API Implementation (No AI SDK):**
```typescript
async function synthesizeSpeech(
  config: SpeechConfig,
  apiKey: string,
  text: string
): Promise<ArrayBuffer> {
  if (config.provider === 'elevenlabs') {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: config.settings,
        }),
      }
    );
    return response.arrayBuffer();
  }

  // Fallback to browser TTS
  // ... existing implementation
}
```

## Service Layer Pattern

### Provider Factory

```typescript
// services/ai/provider-factory.ts
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export class AIProviderFactory {
  static createGeminiProvider(config: {
    apiKey: string;
    baseUrl?: string;
  }) {
    return createGoogleGenerativeAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  static getModel(
    provider: AIProvider,
    modelId: string,
    credentials: ProviderConfig
  ) {
    switch (provider) {
      case 'gemini': {
        const google = this.createGeminiProvider(credentials.gemini);
        return google(modelId);
      }
      // Future: Add OpenAI, Anthropic, etc.
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
```

### Suggestions Service

```typescript
// services/ai/suggestions.ts
import { generateObject } from 'ai';
import { z } from 'zod';
import { AIProviderFactory } from './provider-factory';

export class SuggestionsService {
  async generate(
    config: SuggestionsConfig,
    credentials: ProviderConfig,
    input: string,
    context: Message[]
  ): Promise<string[]> {
    if (!config.enabled) {
      return [];
    }

    const model = AIProviderFactory.getModel(
      config.provider,
      config.model,
      credentials
    );

    const { object } = await generateObject({
      model,
      schema: z.object({
        suggestions: z.array(z.string()),
      }),
      system: config.settings.systemInstructions,
      prompt: input,
      temperature: config.settings.temperature,
      maxOutputTokens: 100,
    });

    return object.suggestions.slice(0, config.settings.maxSuggestions);
  }
}
```

## Migration Strategy

### Phase 1: Add AI SDK (No Breaking Changes)

```typescript
// Install packages
bun add ai @ai-sdk/google

// Add new service alongside existing
// services/ai/gemini-sdk.ts
export class GeminiSDKService {
  // ... new implementation
}

// Keep existing services/gemini.ts
export class GeminiService {
  // ... existing implementation
}
```

### Phase 2: Feature Flag Rollout

```typescript
// Feature flag to control which implementation to use
const USE_AI_SDK = process.env.NEXT_PUBLIC_USE_AI_SDK === 'true';

if (USE_AI_SDK) {
  service = new GeminiSDKService();
} else {
  service = new GeminiService();
}
```

### Phase 3: Full Migration

```typescript
// Remove @google/genai dependency
bun remove @google/genai

// Replace all service implementations
// Update API routes to use AI SDK
```

## API Routes Integration

### Suggestions Endpoint

```typescript
// app/api/ai/suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SuggestionsService } from '@/services/ai/suggestions';
import { AccountsService } from '@/services/accounts';

export async function POST(req: NextRequest) {
  const { userId, input } = await req.json();

  // Get user config
  const accountService = new AccountsService();
  const account = await accountService.get(userId);

  if (!account?.ai_suggestions?.enabled) {
    return NextResponse.json({ suggestions: [] });
  }

  // Generate suggestions
  const suggestionsService = new SuggestionsService();
  const suggestions = await suggestionsService.generate(
    account.ai_suggestions,
    account.ai_providers, // API keys
    input,
    [] // context messages
  );

  return NextResponse.json({ suggestions });
}
```

### Streaming Suggestions

```typescript
import { streamText } from 'ai';

export async function POST(req: NextRequest) {
  const { userId, input } = await req.json();
  const account = await accountService.get(userId);

  const model = AIProviderFactory.getModel(
    account.ai_suggestions.provider,
    account.ai_suggestions.model,
    account.ai_providers
  );

  const result = await streamText({
    model,
    prompt: input,
    temperature: account.ai_suggestions.settings.temperature,
  });

  // Stream to client
  return result.toDataStreamResponse();
}
```

## React Integration

### Using Built-in Hooks

```typescript
// components/editor/suggestions.tsx
import { useCompletion } from 'ai/react';

export function EditorSuggestions() {
  const { complete, completion, isLoading } = useCompletion({
    api: '/api/ai/suggestions',
  });

  const handleInput = (text: string) => {
    complete(text);
  };

  return (
    <div>
      {isLoading && <Spinner />}
      {completion && <SuggestionsList items={completion.split('\n')} />}
    </div>
  );
}
```

## Testing

```typescript
// __tests__/services/ai/suggestions.test.ts
import { SuggestionsService } from '@/services/ai/suggestions';

describe('SuggestionsService', () => {
  it('generates suggestions from Gemini', async () => {
    const service = new SuggestionsService();
    const config = {
      enabled: true,
      provider: 'gemini' as const,
      model: 'gemini-2.5-flash-lite',
      settings: {
        temperature: 0.7,
        maxSuggestions: 5,
      },
    };
    const credentials = {
      gemini: {
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
      },
    };

    const suggestions = await service.generate(
      config,
      credentials,
      'Hello',
      []
    );

    expect(suggestions).toHaveLength(5);
    expect(suggestions[0]).toBeTruthy();
  });
});
```

## Summary

✅ **Data model is fully compatible** with AI SDK
✅ **No schema changes required**
✅ **Clean migration path** with feature flags
✅ **Service layer architecture** maps perfectly to AI SDK
✅ **Type safety** preserved throughout

The current design in `ai-config-storage.md` is well-suited for AI SDK integration.
