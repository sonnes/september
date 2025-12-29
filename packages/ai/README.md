# AI Module

This module manages AI provider configurations, registries, and settings. It provides a unified interface for different AI features like suggestions, transcription, and speech.

## Features

- **Provider Registry**: A centralized list of all supported AI providers (Gemini, ElevenLabs, Browser) and their capabilities.
- **Unified Settings**: A React context (`AISettingsProvider`) to manage and persist AI preferences across the app.
- **Provider Forms**: Reusable UI components for configuring API keys and provider-specific settings.

## Structure

- `components/`: UI components for AI settings.
- `hooks/`: React hooks for accessing and updating AI settings.
- `lib/`: Core logic, provider registry, and default configurations.
- `types/`: Zod schemas and TypeScript type definitions for AI settings.

## Usage

### Using AI Settings

```tsx
import { useAISettings } from '@/packages/ai';

function MyComponent() {
  const { suggestionsConfig, updateSuggestionsConfig } = useAISettings();
  // ...
}
```

### Provider Registry

```tsx
import { AI_PROVIDERS, getProvidersForFeature } from '@/packages/ai';

const speechProviders = getProvidersForFeature('speech');
```

## Hooks

### useGenerate

Hook for generating text or structured objects using AI providers. Reads provider settings from account and initializes the appropriate provider. Uses the modern Vercel AI SDK Output API for type-safe structured generation.

#### Text Generation (Default)

Generate plain text using the default output format:

```tsx
import { useGenerate } from '@/packages/ai';

function MyComponent() {
  const { generate, isGenerating } = useGenerate();

  const handleGenerate = async () => {
    const text = await generate({
      prompt: 'Write a haiku about coding',
      system: 'You are a creative writer.',
    });
    console.log(text);
  };

  return (
    <button onClick={handleGenerate} disabled={isGenerating}>
      {isGenerating ? 'Generating...' : 'Generate'}
    </button>
  );
}
```

#### Object Generation with Schema

Generate structured objects with Zod schema validation:

```tsx
import { useGenerate } from '@/packages/ai';
import { Output } from 'ai';
import { z } from 'zod';

function RecipeGenerator() {
  const { generate, isGenerating } = useGenerate();

  const handleGenerate = async () => {
    const recipe = await generate({
      prompt: 'Generate a lasagna recipe',
      output: Output.object({
        schema: z.object({
          name: z.string(),
          ingredients: z.array(z.object({
            name: z.string(),
            amount: z.string(),
          })),
          steps: z.array(z.string()),
        }),
      }),
    });
    console.log(recipe); // { name: string, ingredients: [...], steps: [...] }
  };

  return <button onClick={handleGenerate} disabled={isGenerating}>Generate Recipe</button>;
}
```

#### Array Generation

Generate arrays of objects with element schema validation:

```tsx
import { useGenerate } from '@/packages/ai';
import { Output } from 'ai';
import { z } from 'zod';

function HeroGenerator() {
  const { generate, isGenerating } = useGenerate();

  const handleGenerate = async () => {
    const heroes = await generate({
      prompt: 'Generate 3 RPG hero descriptions',
      output: Output.array({
        element: z.object({
          name: z.string(),
          class: z.string(),
          description: z.string(),
        }),
      }),
    });
    console.log(heroes); // Array of hero objects
  };

  return <button onClick={handleGenerate} disabled={isGenerating}>Generate Heroes</button>;
}
```

#### Hook Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | `AIProvider` | `'gemini'` | AI provider to use (currently only 'gemini' is supported) |
| `model` | `string` | `'gemini-2.5-flash-lite'` | Model ID to use with the provider |

#### Generate Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | `string` | Yes | The user prompt for generation |
| `system` | `string` | No | Optional system instructions to guide the AI |
| `temperature` | `number` | No | Temperature for generation (0-2, default: 1) |
| `maxOutputTokens` | `number` | No | Maximum output tokens to generate |
| `output` | `Output<T>` | No | Output format specification (default: `Output.text()`) |

#### Output Types

- **Text Generation**: Returns `Promise<string | undefined>`
- **Object Generation**: Returns `Promise<T | undefined>` where T is inferred from the Zod schema
- **Array Generation**: Returns `Promise<T[] | undefined>` where T is the element type from schema

#### Returns

```typescript
interface UseGenerateReturn {
  /** Function to generate content */
  generate(params: GenerateParams): Promise<string | object | undefined>;
  /** Whether generation is currently in progress */
  isGenerating: boolean;
  /** Whether the provider is ready (has API key if required) */
  isReady: boolean;
}
```

