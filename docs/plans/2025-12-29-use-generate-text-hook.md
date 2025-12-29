# Implementation Plan: useGenerate Hook

**Date:** 2025-12-29
**Feature:** Create a reusable hook in `packages/ai` for AI generation (text and structured objects)
**Research:** [docs/research/2025-12-29-use-generate-text-hook.md](../research/2025-12-29-use-generate-text-hook.md)

---

## Overview

Create a flexible `useGenerate` hook that:
1. Reads provider settings from the account package via `useAISettings()`
2. Initializes the appropriate AI provider (gemini, webllm)
3. Provides a unified `generate` function for both text and structured object generation
4. Uses the modern Vercel AI SDK `Output` API for type-safe structured data
5. Supports multiple providers with sensible defaults
6. **Replaces existing duplicate provider initialization logic across the codebase**

---

## Task 1: Create the Hook

**File:** `/packages/ai/hooks/use-generate.ts`

### 1.1 TypeScript Interfaces

```typescript
import { Output } from 'ai';
import { z } from 'zod';
import { AIProvider } from '@/types/ai-config';

/**
 * Options for configuring the useGenerate hook
 */
export interface UseGenerateOptions {
  /** AI provider to use (default: 'gemini') */
  provider?: AIProvider;
  /** Model ID to use (default: 'gemini-2.5-flash-lite' for gemini) */
  model?: string;
}

/**
 * Base parameters for generation
 */
interface BaseGenerateParams {
  /** The user prompt */
  prompt: string;
  /** Optional system instructions */
  system?: string;
  /** Temperature for generation (0-2, default: 1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
}

/**
 * Parameters for text generation
 */
export interface GenerateTextParams extends BaseGenerateParams {
  output?: typeof Output.text;
}

/**
 * Parameters for object generation with schema validation
 */
export interface GenerateObjectParams<T extends z.ZodType> extends BaseGenerateParams {
  output: ReturnType<typeof Output.object<T>>;
}

/**
 * Parameters for array generation with element schema
 */
export interface GenerateArrayParams<T extends z.ZodType> extends BaseGenerateParams {
  output: ReturnType<typeof Output.array<T>>;
}

/**
 * Union type for all generate params
 */
export type GenerateParams<T extends z.ZodType = z.ZodString> =
  | GenerateTextParams
  | GenerateObjectParams<T>
  | GenerateArrayParams<T>;

/**
 * Return type for the useGenerate hook
 */
export interface UseGenerateReturn {
  /** Function to generate text or structured output */
  generate: {
    // Overload for text generation (default)
    (params: GenerateTextParams): Promise<string | undefined>;
    // Overload for object generation
    <T extends z.ZodType>(params: GenerateObjectParams<T>): Promise<z.infer<T> | undefined>;
    // Overload for array generation
    <T extends z.ZodType>(params: GenerateArrayParams<T>): Promise<z.infer<T>[] | undefined>;
  };
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Whether the provider is ready (has API key if required) */
  isReady: boolean;
}
```

### 1.2 Full Implementation

```typescript
'use client';

import { useCallback, useMemo, useState } from 'react';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, Output } from 'ai';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAISettings } from '@/packages/ai/hooks/use-ai-settings';
import { AI_PROVIDERS } from '@/packages/ai/lib/registry';
import { AIProvider } from '@/types/ai-config';

/**
 * Options for configuring the useGenerate hook
 */
export interface UseGenerateOptions {
  /** AI provider to use (default: 'gemini') */
  provider?: AIProvider;
  /** Model ID to use (default: 'gemini-2.5-flash-lite' for gemini) */
  model?: string;
}

/**
 * Base parameters for generation
 */
interface BaseGenerateParams {
  /** The user prompt */
  prompt: string;
  /** Optional system instructions */
  system?: string;
  /** Temperature for generation (0-2, default: 1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
}

/**
 * Parameters for text generation
 */
export interface GenerateTextParams extends BaseGenerateParams {
  output?: ReturnType<typeof Output.text>;
}

/**
 * Parameters for object generation with schema validation
 */
export interface GenerateObjectParams<T extends z.ZodType> extends BaseGenerateParams {
  output: ReturnType<typeof Output.object<T>>;
}

/**
 * Parameters for array generation with element schema
 */
export interface GenerateArrayParams<T extends z.ZodType> extends BaseGenerateParams {
  output: ReturnType<typeof Output.array<T>>;
}

/**
 * Return type for the useGenerate hook
 */
export interface UseGenerateReturn {
  /** Generate text (default) */
  generate(params: GenerateTextParams): Promise<string | undefined>;
  /** Generate structured object */
  generate<T extends z.ZodType>(params: GenerateObjectParams<T>): Promise<z.infer<T> | undefined>;
  /** Generate array of objects */
  generate<T extends z.ZodType>(params: GenerateArrayParams<T>): Promise<z.infer<T>[] | undefined>;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Whether the provider is ready (has API key if required) */
  isReady: boolean;
}

const DEFAULT_PROVIDER: AIProvider = 'gemini';
const DEFAULT_MODELS: Record<string, string> = {
  gemini: 'gemini-2.5-flash-lite',
};

/**
 * Hook for generating text or structured objects using AI providers.
 * Reads provider settings from account and initializes the appropriate provider.
 * Uses the modern Vercel AI SDK Output API for type-safe structured generation.
 *
 * @example Text generation
 * ```tsx
 * const { generate, isGenerating } = useGenerate();
 *
 * // Generate plain text (default)
 * const text = await generate({
 *   prompt: 'Write a haiku about coding',
 *   system: 'You are a creative writer.',
 * });
 * ```
 *
 * @example Object generation with schema
 * ```tsx
 * import { Output } from 'ai';
 * import { z } from 'zod';
 *
 * const { generate } = useGenerate();
 *
 * const recipe = await generate({
 *   prompt: 'Generate a lasagna recipe',
 *   output: Output.object({
 *     schema: z.object({
 *       name: z.string(),
 *       ingredients: z.array(z.object({
 *         name: z.string(),
 *         amount: z.string(),
 *       })),
 *       steps: z.array(z.string()),
 *     }),
 *   }),
 * });
 * ```
 *
 * @example Array generation
 * ```tsx
 * const { generate } = useGenerate();
 *
 * const heroes = await generate({
 *   prompt: 'Generate 3 RPG hero descriptions',
 *   output: Output.array({
 *     element: z.object({
 *       name: z.string(),
 *       class: z.string(),
 *       description: z.string(),
 *     }),
 *   }),
 * });
 * ```
 */
export function useGenerate(options: UseGenerateOptions = {}): UseGenerateReturn {
  const { provider = DEFAULT_PROVIDER, model } = options;

  const { getProviderConfig } = useAISettings();
  const [isGenerating, setIsGenerating] = useState(false);

  // Get provider configuration (API key, base URL)
  const providerConfig = getProviderConfig(provider);
  const apiKey = providerConfig?.api_key;

  // Check if provider requires API key and has one
  const providerInfo = AI_PROVIDERS[provider];
  const isReady = !providerInfo?.requires_api_key || !!apiKey;

  // Determine the model to use
  const modelId = model ?? DEFAULT_MODELS[provider] ?? DEFAULT_MODELS.gemini;

  // Memoize provider initialization
  const googleProvider = useMemo(() => {
    if (provider !== 'gemini') return null;
    return createGoogleGenerativeAI({
      apiKey: apiKey || '',
    });
  }, [provider, apiKey]);

  const generate = useCallback(
    async <T extends z.ZodType>(
      params: GenerateTextParams | GenerateObjectParams<T> | GenerateArrayParams<T>
    ): Promise<string | z.infer<T> | z.infer<T>[] | undefined> => {
      const { prompt, system, temperature, maxTokens, output } = params;

      // Validate API key for providers that require it
      if (providerInfo?.requires_api_key && !apiKey) {
        toast.error(`API key is required for ${providerInfo.name}.`);
        return undefined;
      }

      // Currently only gemini is supported
      if (provider !== 'gemini') {
        toast.error(`Provider "${provider}" is not yet supported for generation.`);
        return undefined;
      }

      if (!googleProvider) {
        toast.error('Failed to initialize AI provider.');
        return undefined;
      }

      setIsGenerating(true);

      try {
        const result = await generateText({
          model: googleProvider(modelId),
          prompt,
          system,
          temperature,
          maxTokens,
          // Use Output.text() as default if no output specified
          output: output ?? Output.text(),
        });

        // For text generation, result.output is the string
        // For object/array generation, result.output is the validated object/array
        if (result.output === undefined || result.output === null) {
          toast.error('Failed to generate content. Please try again.');
          return undefined;
        }

        return result.output;
      } catch (error) {
        console.error('Generation error:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to generate content. Please try again.'
        );
        return undefined;
      } finally {
        setIsGenerating(false);
      }
    },
    [provider, providerInfo, apiKey, googleProvider, modelId]
  ) as UseGenerateReturn['generate'];

  return {
    generate,
    isGenerating,
    isReady,
  };
}
```

---

## Task 2: Update Package Exports

**File:** `/packages/ai/index.ts`

Add the new export:

```typescript
export * from '@/packages/ai/lib/defaults';
export * from '@/packages/ai/lib/registry';
export * from '@/packages/ai/hooks/use-ai-settings';
export * from '@/packages/ai/hooks/use-generate';  // ADD THIS LINE
export * from '@/packages/ai/components/context';
export * from '@/packages/ai/types/schemas';
export * from '@/packages/ai/components/ai-providers-form';
export * from '@/packages/ai/components/provider-section';
export * from '@/packages/ai/components/transcription-form';
```

---

## Task 3: Update README Documentation

**File:** `/packages/ai/README.md`

Add documentation for the new hook under the Hooks section:

````markdown
### useGenerate

Hook for AI generation with automatic provider configuration. Supports both plain text and structured object generation using the Vercel AI SDK `Output` API.

#### Text Generation (Default)

```tsx
import { useGenerate } from '@/packages/ai';

function MyComponent() {
  const { generate, isGenerating, isReady } = useGenerate();

  const handleGenerate = async () => {
    const text = await generate({
      prompt: 'Write a haiku about coding',
      system: 'You are a creative writer.',
      temperature: 0.7,
    });

    if (text) {
      console.log(text);
    }
  };

  return (
    <button onClick={handleGenerate} disabled={!isReady || isGenerating}>
      {isGenerating ? 'Generating...' : 'Generate'}
    </button>
  );
}
```

#### Object Generation with Schema

Generate structured, type-safe objects using Zod schemas:

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
            amount: z.string().describe('Amount with unit (e.g., "200g")'),
          })),
          steps: z.array(z.string()),
        }),
      }),
    });

    if (recipe) {
      // recipe is fully typed: { name: string, ingredients: [...], steps: [...] }
      console.log(recipe.name);
      console.log(recipe.ingredients);
    }
  };

  return <button onClick={handleGenerate}>Generate Recipe</button>;
}
```

#### Array Generation

Generate arrays of structured objects:

```tsx
import { useGenerate } from '@/packages/ai';
import { Output } from 'ai';
import { z } from 'zod';

const { generate } = useGenerate();

const heroes = await generate({
  prompt: 'Generate 3 RPG hero descriptions',
  output: Output.array({
    element: z.object({
      name: z.string(),
      class: z.string().describe('e.g., warrior, mage, thief'),
      description: z.string(),
    }),
  }),
});

// heroes is typed as Array<{ name: string, class: string, description: string }>
```

**Hook Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | `AIProvider` | `'gemini'` | AI provider to use |
| `model` | `string` | `'gemini-2.5-flash-lite'` | Model ID |

**Generate Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | `string` | Yes | The prompt to generate from |
| `system` | `string` | No | System instructions |
| `temperature` | `number` | No | Generation temperature (0-2) |
| `maxTokens` | `number` | No | Maximum tokens to generate |
| `output` | `Output.*` | No | Output type (text, object, array). Defaults to text. |

**Output Types:**
- `Output.text()` - Plain text (default)
- `Output.object({ schema })` - Validated object matching Zod schema
- `Output.array({ element })` - Array of validated objects
- `Output.choice({ options })` - One of specified string options
- `Output.json()` - Unstructured JSON

**Returns:**
| Property | Type | Description |
|----------|------|-------------|
| `generate` | `(params) => Promise<T \| undefined>` | Function to generate content |
| `isGenerating` | `boolean` | Loading state |
| `isReady` | `boolean` | Whether provider has required API key |
````

---

## Task 4: Refactor Existing Hooks to Use useGenerate

Three existing hooks duplicate provider initialization logic. Refactor them to use the new `useGenerate` hook.

### 4.1 Refactor `use-corpus.ts`

**File:** `/packages/suggestions/hooks/use-corpus.ts`

**Current code** (70 lines with duplicate provider logic):
```typescript
// Has its own createGoogleGenerativeAI, useMemo for provider, etc.
```

**Refactored code:**

```typescript
'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { useGenerate } from '@/packages/ai';

const CORPUS_GENERATION_PROMPT = `You need to generate a corpus of synthetic data up to 5000 characters based on the persona.
The corpus should have wide variety of spoken phrases, sentences, expressions, etc.
Include emojis, slang, and other jargon.
Include mix of formal and informal language.
Include mix of short and long sentences.
This data will be used to train an autocompletion system.
Each sentence should be in a new line.
The corpus should be in the same language as the persona.
Do not highlight answers with asterisk.
Since your output will be used as the user's input, do not include any extra notes, labels or explanations in your output.`;

export function useCorpus() {
  const { generate, isGenerating } = useGenerate();

  const generateCorpus = async (persona: string) => {
    const text = await generate({
      prompt: `PERSONA: ${persona}\n\nCORPUS:`,
      system: CORPUS_GENERATION_PROMPT,
    });

    if (!text) {
      toast.error('Failed to generate corpus. Please try again.');
      return;
    }

    return text;
  };

  return { isGenerating, generateCorpus };
}
```

**Lines reduced:** 70 → ~30 (57% reduction)

---

### 4.2 Refactor `use-generate-keyboard.ts`

**File:** `/packages/keyboards/hooks/use-generate-keyboard.ts`

**Current code** (128 lines with duplicate provider logic):
```typescript
// Has its own createGoogleGenerativeAI, useMemo for provider, generateObject, etc.
```

**Refactored code:**

```typescript
'use client';

import { useCallback, useState } from 'react';

import { Output } from 'ai';
import { z } from 'zod';

import { useGenerate } from '@/packages/ai';

const KEYBOARD_GENERATION_PROMPT = `You are an assistive communication expert designing custom AAC (Augmentative and Alternative Communication) keyboards for users with speech difficulties.

Your task is to generate a full chat title, a concise keyboard title, and 24 phrase starters based on the user's first message in a conversation.

Requirements:
1. Chat Title: Short, descriptive name for this conversation (max 50 characters) - used for chat context
2. Keyboard Title: Concise reference name (MAX 2 WORDS) - displayed on keyboard tabs for quick recognition
3. Buttons: Exactly 24 contextually relevant phrase starters
4. Each button text must be MAX 3 words
5. Each button text must be MAX 50 characters
6. Phrases should be complete sentence starters that help the user communicate efficiently
7. Phrases should cover common responses, follow-ups, and related topics
8. Prioritize practical, frequently-used phrases over complex sentences

Examples:
- Message: "I need to schedule my doctor appointment"
  - Chat Title: "Medical Appointments"
  - Keyboard Title: "Medical"
  - Buttons: ["Yes, please", "No, thanks", "What time?", "Morning works", "Afternoon better", ...]

- Message: "What should we have for dinner tonight?"
  - Chat Title: "Dinner Planning"
  - Keyboard Title: "Dinner"
  - Buttons: ["Sounds good", "I'm hungry", "Not sure", "Pizza?", "Chicken?", ...]`;

const KeyboardGenerationSchema = z.object({
  chatTitle: z.string().min(1).max(50),
  keyboardTitle: z.string().min(1).max(50).regex(/^(\w+\s)?(\w+)$/, 'Max 2 words'),
  buttons: z.array(z.string().max(50)).length(24),
});

interface GenerateKeyboardParams {
  messageText: string;
  chatId: string;
}

interface GeneratedKeyboardData {
  chatTitle: string;
  keyboardTitle: string;
  buttons: string[];
}

interface UseGenerateKeyboardFromMessageReturn {
  generateKeyboard: (params: GenerateKeyboardParams) => Promise<GeneratedKeyboardData>;
  isGenerating: boolean;
  error?: { message: string };
}

export function useGenerateKeyboardFromMessage(): UseGenerateKeyboardFromMessageReturn {
  const [error, setError] = useState<{ message: string } | undefined>();
  const { generate, isGenerating, isReady } = useGenerate();

  const generateKeyboard = useCallback(
    async (params: GenerateKeyboardParams): Promise<GeneratedKeyboardData> => {
      if (!isReady) {
        console.log('Google API key not configured, skipping keyboard generation');
        throw new Error('API key not configured');
      }

      setError(undefined);

      try {
        const result = await generate({
          prompt: `First message: "${params.messageText}"\n\nGenerate a title and 24 phrase starters.`,
          system: KEYBOARD_GENERATION_PROMPT,
          output: Output.object({
            schema: KeyboardGenerationSchema,
          }),
        });

        if (!result?.chatTitle || !result?.keyboardTitle || !result?.buttons) {
          throw new Error('Invalid AI response format');
        }

        return {
          chatTitle: result.chatTitle,
          keyboardTitle: result.keyboardTitle,
          buttons: result.buttons,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate keyboard suggestions';
        console.error('Error generating keyboard:', err);
        setError({ message: errorMessage });
        throw err;
      }
    },
    [generate, isReady]
  );

  return {
    generateKeyboard,
    isGenerating,
    error,
  };
}
```

**Lines reduced:** 128 → ~85 (34% reduction)

---

### 4.3 Refactor `use-suggestions.ts`

**File:** `/packages/suggestions/hooks/use-suggestions.ts`

**Note:** This hook is more complex because it uses `useEffect` with debouncing and message history. The refactoring keeps the domain logic but removes duplicate provider initialization.

**Refactored code:**

```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';

import { Output } from 'ai';
import { z } from 'zod';

import { useDebounce } from '@/hooks/use-debounce';

import { useAISettings, useGenerate } from '@/packages/ai';
import { Message } from '@/packages/chats';
import { Suggestion } from '@/packages/suggestions/types';

const SUGGESTIONS_PROMPT = `You are a predictive text assistant for the User in a conversation with a Partner.
Generate 5 contextual suggestions that the User would likely say next.

<persona>
{USER_PERSONA}
</persona>

Rules:
1. Suggestions must be complete, standalone sentences.
2. If the User is typing, suggestions should complete or naturally extend their current thought.
3. If the User is not typing, provide relevant responses to the Partner or new conversation starters.
4. Match the User's persona, tone, and communication style.
5. Return ONLY a JSON array of 5 strings.

Examples:
- Partner: "What time?" | User (typing): "6" -> ["6 PM works for me", "I'll be there by 6", "Around 6:30?", "I'm free after 6", "Let's meet at 6"]
- Partner: "How are you?" | User (typing): "" -> ["I'm doing well, thanks!", "Good, how about you?", "Not too bad, just busy.", "Great! Excited for today", "I'm okay, hanging in there"]`;

const SuggestionsSchema = z.object({
  suggestions: z.array(z.string()),
});

interface UseSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  clearSuggestions: () => void;
}

export function useSuggestions({
  text,
  timeout = 2000,
  history = [],
}: {
  text: string;
  timeout?: number;
  history?: Message[];
}): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const debouncedText = useDebounce(text, timeout);
  const [isLoading, setIsLoading] = useState(false);

  const { suggestionsConfig } = useAISettings();
  const { generate, isReady } = useGenerate({
    model: suggestionsConfig.model,
  });

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Auto-fetch suggestions when debounced text changes
  useEffect(() => {
    if (debouncedText.trim().length === 0 || !isReady) {
      if (debouncedText.trim().length === 0) {
        setSuggestions([]);
      }
      return;
    }

    const fetchSuggestions = async (text: string, messages: Message[]) => {
      if (!isReady || isLoading || !suggestionsConfig.enabled) {
        return;
      }

      setIsLoading(true);

      try {
        const messagesContent = messages
          .map(m => `${m.type === 'transcription' ? 'Partner' : 'User'}: ${m.text}`)
          .join('\n');

        const result = await generate({
          prompt: `${messagesContent}\nUser: ${text}`,
          system: SUGGESTIONS_PROMPT.replace(
            '{USER_PERSONA}',
            suggestionsConfig.settings?.system_instructions || ''
          ),
          output: Output.object({
            schema: SuggestionsSchema,
          }),
        });

        if (result?.suggestions) {
          setSuggestions(
            result.suggestions.map((suggestionText: string) => ({
              text: suggestionText,
              audio_path: undefined,
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions(debouncedText, history);
  }, [debouncedText, isReady, suggestionsConfig.enabled, suggestionsConfig.model, history, generate]);

  return {
    suggestions,
    isLoading,
    clearSuggestions,
  };
}
```

**Lines reduced:** 135 → ~105 (22% reduction)

---

## Validation Checklist

After implementation, verify:

- [ ] **TypeScript compiles without errors**
  ```bash
  pnpm exec tsc --noEmit
  ```

- [ ] **ESLint passes**
  ```bash
  pnpm run lint
  ```

- [ ] **Build succeeds**
  ```bash
  pnpm run build
  ```

- [ ] **Manual Testing - New Hook**
  - [ ] Import hook: `import { useGenerate } from '@/packages/ai'`
  - [ ] Test text generation (no output param)
  - [ ] Test object generation with `Output.object({ schema })`
  - [ ] Test array generation with `Output.array({ element })`
  - [ ] Verify TypeScript infers correct return types
  - [ ] Test without API key - should show toast error
  - [ ] Test `isGenerating` state updates correctly
  - [ ] Test `isReady` returns false when API key missing

- [ ] **Manual Testing - Refactored Hooks**
  - [ ] `useCorpus` - Generate corpus still works
  - [ ] `useGenerateKeyboardFromMessage` - Keyboard generation still works
  - [ ] `useSuggestions` - Suggestions still appear after debounce

---

## Files Changed Summary

| File | Action | Description |
|------|--------|-------------|
| `/packages/ai/hooks/use-generate.ts` | **Create** | New hook with text + object generation |
| `/packages/ai/index.ts` | **Modify** | Add export |
| `/packages/ai/README.md` | **Modify** | Add documentation |
| `/packages/suggestions/hooks/use-corpus.ts` | **Modify** | Refactor to use `useGenerate` |
| `/packages/keyboards/hooks/use-generate-keyboard.ts` | **Modify** | Refactor to use `useGenerate` |
| `/packages/suggestions/hooks/use-suggestions.ts` | **Modify** | Refactor to use `useGenerate` |

---

## Benefits of Refactoring

| Metric | Before | After |
|--------|--------|-------|
| Provider init locations | 3 separate files | 1 centralized hook |
| Total lines (3 hooks) | ~333 | ~220 |
| Code duplication | High | Eliminated |
| API key handling | 3 implementations | 1 implementation |
| Provider switching | Requires changes in 3 files | Change in 1 place |

**Key improvements:**
- **DRY**: Single source of truth for provider initialization
- **Maintainability**: Changes to provider logic only need to happen once
- **Consistency**: All AI generation uses the same error handling and loading states
- **Future-proof**: Adding new providers (webllm) only requires updating `useGenerate`

---

## Risk Assessment

**Medium Risk** - Refactoring existing functionality:
- All existing behavior must be preserved
- Thorough testing of all three refactored hooks required
- Uses existing `useAISettings` hook
- All dependencies already installed (`ai`, `zod`)

**Edge Cases Handled:**
- Missing API key → Toast error, return undefined
- Unsupported provider → Toast error, return undefined
- Network/API errors → Try-catch with toast notification
- Schema validation failure → AI SDK handles, returns error
- Empty/null response → Toast error, return undefined

**Mitigation:**
- Test each refactored hook individually before committing
- Compare behavior before/after refactoring
- Keep original files as backup until verification complete

---

## API Comparison

| Feature | Old `generateObject` | New `Output.object()` |
|---------|---------------------|----------------------|
| Location | Separate function | Part of `generateText` |
| Streaming | `streamObject` | `streamText` with `partialOutputStream` |
| Combine with tools | No | Yes |
| Status | Deprecated | Recommended |

The new `Output` API is the modern, recommended approach from Vercel AI SDK.
