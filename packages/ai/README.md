# @september/ai

Shared AI settings, provider metadata, generation, schemas, and settings forms.

## Public API

```ts
import {
  AIProvidersForm,
  type AIProvidersFormData,
  AIProvidersSchema,
  AISettingsProvider,
  AI_PROVIDERS,
  type GenerateObjectParams,
  type GenerateTextParams,
  ProviderSection,
  SpeechProviderSchema,
  SpeechSettingsSchema,
  TranscriptionForm,
  type TranscriptionFormData,
  type UseGenerateOptions,
  type UseGenerateReturn,
  getModelsForProvider,
  getProvidersForFeature,
  supportsFeature,
  useAISettings,
  useGenerate,
} from '@september/ai';
```

Root exports are curated. Defaults, middleware, and registry internals stay package-private unless a consumer needs them through the public API.

## Settings

Wrap app UI with `AISettingsProvider`, then read and update account-backed AI settings with `useAISettings`.

```tsx
import { AISettingsProvider, useAISettings } from '@september/ai';

function AppProviders({ children }: { children: React.ReactNode }) {
  return <AISettingsProvider>{children}</AISettingsProvider>;
}

function SuggestionsToggle() {
  const { suggestionsConfig, updateSuggestionsConfig } = useAISettings();

  return (
    <button onClick={() => updateSuggestionsConfig({ enabled: !suggestionsConfig.enabled })}>
      Toggle suggestions
    </button>
  );
}
```

## Provider Registry

```ts
import {
  AI_PROVIDERS,
  getModelsForProvider,
  getProvidersForFeature,
  supportsFeature,
} from '@september/ai';

const speechProviders = getProvidersForFeature('speech');
const geminiModels = getModelsForProvider('gemini');
const canTranscribe = supportsFeature('gemini', 'transcription');
```

## Generation

`useGenerate()` defaults to Gemini with `gemini-2.5-flash-lite`. Gemini still requires a configured API key in account settings.

```tsx
import { useGenerate } from '@september/ai';

function HaikuButton() {
  const { generate, isGenerating, isReady } = useGenerate();

  async function handleClick() {
    const text = await generate({
      prompt: 'Write a haiku about coding',
      system: 'You are a concise writer.',
      feature: 'suggestions',
    });

    console.log(text);
  }

  return (
    <button onClick={handleClick} disabled={!isReady || isGenerating}>
      Generate
    </button>
  );
}
```

Pass a schema for structured output:

```tsx
import { useGenerate } from '@september/ai';
import { z } from 'zod';

const RecipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.object({ name: z.string(), amount: z.string() })),
  steps: z.array(z.string()),
});

function RecipeButton() {
  const { generate } = useGenerate();

  async function handleClick() {
    const recipe = await generate({
      prompt: 'Generate a lasagna recipe',
      schema: RecipeSchema,
    });

    console.log(recipe);
  }

  return <button onClick={handleClick}>Generate recipe</button>;
}
```

Override provider or model when a caller has a specific generation target:

```ts
const { generate } = useGenerate({
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
});
```

## Forms

`AIProvidersForm`, `ProviderSection`, and `TranscriptionForm` are reusable settings forms. `TranscriptionFormData` and `AIProvidersFormData` are exported from the root for consumer submit handlers.

## Text Extraction

`extractText` sends one or more files to Gemini 2.5 Flash and returns markdown-formatted text with `---` chunk separators. Throws `Error('Could not extract text from files')` on failure.

```ts
import { extractText } from '@september/ai';

const markdown = await extractText(apiKey, files);
```
