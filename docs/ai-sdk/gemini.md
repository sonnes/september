# Gemini Provider (AI SDK)

## Installation

```bash
bun add @ai-sdk/google ai
```

## Configuration

### Basic Setup

```typescript
import { google } from '@ai-sdk/google';

// Default configuration (uses GOOGLE_GENERATIVE_AI_API_KEY env var)
const model = google('gemini-2.5-flash');

// Custom configuration
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: 'your-api-key',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta', // optional
});
```

## Models

| Model ID | Use Case | Context Window |
|----------|----------|----------------|
| `gemini-2.5-flash` | Fast text generation | 1M tokens |
| `gemini-2.5-flash-lite` | Lightweight, faster | 1M tokens |
| `gemini-2.5-pro` | Advanced reasoning | 2M tokens |
| `gemini-1.5-flash` | Stable, fast | 1M tokens |
| `gemini-1.5-pro` | Stable, advanced | 2M tokens |

## Usage in September

### AI Suggestions

```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

const result = await generateText({
  model: google('gemini-2.5-flash-lite'),
  system: systemInstructions,
  prompt: userInput,
  temperature: 0.7,
  maxOutputTokens: 100,
});

const suggestions = result.text;
```

### AI Transcription

```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

const result = await generateText({
  model: google('gemini-2.5-flash'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Transcribe this audio:' },
        { type: 'file', data: audioBuffer, mimeType: 'audio/wav' },
      ],
    },
  ],
});

const transcript = result.text;
```

## Provider-Specific Options

```typescript
const result = await generateText({
  model: google('gemini-2.5-flash'),
  prompt: 'Generate suggestions',

  providerOptions: {
    google: {
      // Safety settings
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_LOW_AND_ABOVE',
        },
      ],

      // Thinking/reasoning (advanced models)
      thinkingConfig: {
        thinkingBudget: 8192,
        includeThoughts: true,
      },

      // Structured outputs (enabled by default)
      structuredOutputs: true,
    },
  },
});
```

## Structured Output

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: google('gemini-2.5-flash'),
  schema: z.object({
    suggestions: z.array(z.string()),
  }),
  prompt: 'Generate 5 word suggestions',
});

// object.suggestions is typed as string[]
```

## Error Handling

```typescript
import { APICallError } from 'ai';

try {
  const result = await generateText({
    model: google('gemini-2.5-flash'),
    prompt: 'test',
  });
} catch (error) {
  if (error instanceof APICallError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.statusCode);
  }
}
```

## Migration from @google/genai

### Current Implementation
```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey });
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-lite',
  contents: prompt,
  config: {
    systemInstruction: PROMPT,
    temperature: 0.7,
  },
});
```

### AI SDK Implementation
```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

const result = await generateText({
  model: google('gemini-2.5-flash-lite'),
  system: PROMPT,
  prompt: prompt,
  temperature: 0.7,
});
```

## Benefits for September

1. **Unified Interface**: Same API for all AI providers (Gemini, OpenAI, Anthropic)
2. **Type Safety**: Full TypeScript support with typed responses
3. **Streaming**: Built-in support for streaming responses
4. **Structured Outputs**: Native JSON schema support
5. **Provider Switching**: Easy to switch between providers without code changes
6. **React Integration**: Built-in React hooks (`useChat`, `useCompletion`)
