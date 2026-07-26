# @/packages/ai

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
  type UseTranscribeReturn,
  completeOpenRouterAuth,
  getModelsForProvider,
  getProvidersForFeature,
  startOpenRouterAuth,
  supportsFeature,
  useAISettings,
  useGenerate,
  useTranscribe,
} from '@/packages/ai';
```

Root exports are curated. Defaults, middleware, and registry internals stay package-private unless a consumer needs them through the public API.

## Settings

Wrap app UI with `AISettingsProvider`, then read and update account-backed AI settings with `useAISettings`.

```tsx
import { AISettingsProvider, useAISettings } from '@/packages/ai';

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
} from '@/packages/ai';

const speechProviders = getProvidersForFeature('speech');
const geminiModels = getModelsForProvider('gemini');
const canTranscribe = supportsFeature('gemini', 'transcription');
```

## Providers

Cloud text generation supports **Gemini** and **OpenRouter** (one key → 300+ models:
Claude, Gemini, GPT, Llama). `webllm` runs locally in the browser. OpenRouter is
registry-driven like the others, so it appears automatically in the provider settings
form, and additionally offers a one-click OAuth "Connect" flow (see below).

## Generation

`useGenerate()` defaults to Gemini with `gemini-2.5-flash-lite`. Pass `provider: 'openrouter'`
(with an OpenRouter model id like `google/gemini-2.5-flash-lite`) to route through OpenRouter.
Both require a configured API key in account settings.

### Metering

Every language-model call is recorded by `meteringMiddleware` (`lib/metering.ts`), an AI SDK
`LanguageModelMiddleware` wrapped around the model — not by the call sites. That means a new
generation path is metered the day it is written, and failures are recorded too, not just the
successes the call site turns into a toast.

```ts
wrapLanguageModel({
  model: baseModel,
  middleware: [meteringMiddleware({ userId, provider, model, feature }), cacheMiddleware],
});
```

The meter must stay **outermost** (first in the array). Inside the cache it would never see a
cache hit, and a cache hit is exactly the case worth getting right: the cached result carries the
original call's token usage, so re-reporting it would double-count both tokens and money. The meter
asks `hasCached(params)` before calling through, and records a hit as `cached: true` at $0.

Cost comes from the provider when it reports one and from the local price table otherwise — see
`@/packages/usage`. `openRouterModelArgs` sets `usage: { include: true }` on every OpenRouter call
so `providerMetadata.openrouter.usage.cost` comes back and the cost is *measured* rather than
estimated; it adds no extra request. `extractText` takes an optional `userId` and wraps its own
model with the same middleware.

`wrapStream` is deliberately not implemented — no LLM path streams today. Add it alongside
`wrapGenerate` if one ever does, or those calls will go unmetered.

### Free OpenRouter stack

Suggestions and keyboard generation default to the **free OpenRouter stack** — the
`september/free-stack` sentinel model id (see `DEFAULT_SUGGESTIONS_CONFIG`). On the
OpenRouter path, `openRouterModelArgs` (`lib/openrouter-model.ts`) expands this sentinel
into the first model of `OPENROUTER_FREE_STACK` plus the rest as an OpenRouter `models`
fallback chain, with `provider: { sort: 'throughput' }`. The chain rolls to the next
free model on rate-limit (429)/errors, so connecting OpenRouter (one click, no spend) is
enough to use suggestions at no cost. Any concrete model id (free or paid) passes through
unchanged. Suggestions stay **disabled** by default until the user opts in. The free model
list is the single source of truth in `lib/openrouter-model.ts`; refresh the ids there when
they rotate.

```tsx
import { useGenerate } from '@/packages/ai';

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
import { useGenerate } from '@/packages/ai';
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

For multimodal text generation (e.g. transcription), pass `audio`; the `prompt` becomes
the instruction sent alongside the audio:

```ts
const text = await generate({
  prompt: 'Transcribe this audio.',
  audio: { data: bytes, mediaType: 'audio/webm' },
  feature: 'transcription',
});
```

## Transcription

`useTranscribe()` transcribes an audio `Blob` with the account's transcription provider —
Gemini or OpenRouter client-side with the user's own key (the same path as suggestions), or
**`whisper`**, which runs `onnx-community/whisper-base` in a Web Worker
(`lib/whisper-worker.ts`) so audio never leaves the device. The whisper path needs no key
(`isReady` is always true), decodes the blob to 16 kHz mono via `AudioContext`, prefers WebGPU
and falls back to WASM, and downloads the model once (~80 MB, cached by Transformers.js in the
browser Cache API). Privacy-mode onboarding presets `ai_transcription.provider = 'whisper'`.

The cloud path is metered by the generation middleware. The whisper path has no model call to
wrap, so `useTranscribe` records it itself — with the audio length and a `free` cost, because
"it ran here and cost nothing" is worth showing rather than leaving blank.

```tsx
import { useTranscribe } from '@/packages/ai';

function Recorder() {
  const { transcribe, isTranscribing, isReady } = useTranscribe();

  async function handleBlob(blob: Blob) {
    const text = await transcribe(blob);
    console.log(text);
  }
}
```

## Connect with OpenRouter (OAuth PKCE)

`startOpenRouterAuth(callbackUrl)` begins a fully client-side PKCE (S256) flow: it generates
a verifier, stores it in `sessionStorage`, and redirects to OpenRouter. On return,
`completeOpenRouterAuth(code)` exchanges the `?code` for a **user-controlled** API key that the
caller saves into the local account (`ai_providers.openrouter.api_key`). No September backend or
server identity is involved. The `ProviderSection` for OpenRouter renders a "Connect" button
automatically (driven by the registry `oauth` flag); the providers settings page handles the
returning `?code`.

```ts
import { startOpenRouterAuth, completeOpenRouterAuth } from '@/packages/ai';

// Kick off (full-page redirect):
await startOpenRouterAuth(`${window.location.origin}/settings/providers`);

// On the callback page:
const key = await completeOpenRouterAuth(code);
await updateAccount({ ai_providers: { ...account.ai_providers, openrouter: { api_key: key } } });
```

## Forms

`AIProvidersForm`, `ProviderSection`, and `TranscriptionForm` are reusable settings forms. `TranscriptionFormData` and `AIProvidersFormData` are exported from the root for consumer submit handlers.

## Text Extraction

`extractText` sends one or more files to Gemini 2.5 Flash and returns markdown-formatted text with `---` chunk separators. Throws `Error('Could not extract text from files')` on failure. Pass the signed-in `userId` to meter the call — it is the largest single generation the app makes.

```ts
import { extractText } from '@/packages/ai';

const markdown = await extractText(apiKey, files, user?.id);
```
