# Plan: Free OpenRouter default for suggestions, user-pickable later

## Context

September's AI text features (suggestions + keyboard generation) currently
default to **Gemini** (`gemini-2.5-flash-lite`), which requires the user to bring
a Google API key. We want a lower-friction starting point: default to a **free
OpenRouter model stack** so that once a user connects OpenRouter (one click, free
account, no spend), suggestions work at no cost — while still letting them pick a
specific/paid model later.

The "let users pick later" half is **already built**: `/settings/suggestions` has
a provider + model picker persisted to IndexedDB. This plan focuses on (1) making
the free OpenRouter stack the default, and (2) wiring OpenRouter's multi-model
fallback so the free default survives free-tier rate limits.

**Decisions (confirmed with user):**
- Free default = **OpenRouter free stack** (not WebLLM). Requires one-time connect.
- Scope = **suggestions + keyboard** only (they share `suggestionsConfig`). Transcription unchanged.
- AI stays **off by default** (`enabled: false`); the free stack is merely pre-selected for when the user opts in.

## Approach

### 1. Add free models + a "free stack" entry to the registry
File: `apps/web/src/packages/ai/lib/registry.ts` (the `openrouter.models` array).

Prepend a sentinel "free stack" entry and add the individual free models (so they
also appear individually in the picker). Live free IDs verified against the
OpenRouter `/models` API:

```ts
models: [
  {
    id: 'september/free-stack',           // sentinel — not a real OR model id
    name: 'Free (recommended)',
    description: 'Free models with automatic fallback. No cost, no key beyond connecting OpenRouter.',
  },
  { id: 'qwen/qwen3-next-80b-a3b-instruct:free', name: 'Qwen3 Next 80B (free)', description: 'Fast MoE, strong quality' },
  { id: 'google/gemma-4-26b-a4b-it:free',        name: 'Gemma 4 26B (free)',    description: 'Fast, good general chat' },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free',   name: 'Nemotron 3 Nano (free)', description: 'Fast, solid reasoning' },
  { id: 'openai/gpt-oss-20b:free',               name: 'GPT-OSS 20B (free)',    description: 'Good all-rounder' },
  // ...existing paid entries (gemini-2.5-flash-lite, claude-haiku-4.5, gpt-5.4-mini) stay
]
```

Export the stack ordering as a constant for the hook to consume:

```ts
export const OPENROUTER_FREE_STACK_ID = 'september/free-stack';
export const OPENROUTER_FREE_STACK = [
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'openai/gpt-oss-20b:free',
];
```

### 2. Change the suggestions default
File: `apps/web/src/packages/ai/lib/defaults.ts`.

`DEFAULT_SUGGESTIONS_CONFIG`: `provider: 'openrouter'`, `model: 'september/free-stack'`.
Leave `enabled: false` and the `settings` block as-is. `DEFAULT_TRANSCRIPTION_CONFIG` unchanged.

### 3. Wire the fallback stack in the generation hook
File: `apps/web/src/packages/ai/hooks/use-generate.ts`.

Today line 166 calls `providerInstance(modelId)` with no settings. For OpenRouter,
build settings that (a) expand the free-stack sentinel into the `models` fallback
array and (b) bias toward fast hosts. The provider's `OpenRouterChatSettings`
natively supports `models?: string[]` and `provider?: { sort }` (verified in
`@openrouter/ai-sdk-provider@1.5.4` `dist/index.d.ts:202,130`).

```ts
function buildOpenRouterModel(providerInstance, modelId) {
  if (modelId === OPENROUTER_FREE_STACK_ID) {
    const [primary, ...rest] = OPENROUTER_FREE_STACK;
    return providerInstance(primary, {
      models: rest,                       // fallback chain on 429 / errors
      provider: { sort: 'throughput' },   // prefer fastest host per model
    });
  }
  return providerInstance(modelId);
}
```

Use this only on the `provider === 'openrouter'` path; gemini/webllm keep
`providerInstance(modelId)`. Keep the existing `wrapLanguageModel(... cacheMiddleware)`
wrap around the result. For analytics (`track(... model: modelId)`), pass the
sentinel id verbatim — the response's actual model isn't surfaced by the SDK call
here, and the sentinel is the meaningful "what did the user choose" value.

Also update the module-level `DEFAULT_GENERATION_PROVIDER`/`DEFAULT_GENERATION_MODEL`
constants? **No** — these are only the fallback when `useGenerate()` is called with
no options; suggestions/keyboard always pass explicit config. Leave them as gemini
to avoid changing transcription/other callers' implicit default. (Confirm no caller
relies on them for OpenRouter during implementation.)

### 4. Picker already works — verify, don't rebuild
File: `apps/web/src/packages/ai/components/` suggestions form + `/settings/suggestions`.

The model dropdown is populated by `getModelsForProvider('openrouter')`, so the new
free-stack entry + individual free models appear automatically. No code change
expected; just confirm the new entries render and selecting a non-free model still
routes through the plain `providerInstance(modelId)` path.

### 5. Docs
- Update `apps/web/src/packages/ai/README.md` (free default + fallback-stack behavior).
- Add a short note in `docs/notes/2026-06-13-openrouter-support.md` (or a new dated note) recording the free-stack default and the sentinel-id mechanism.

## TDD / tests

Per repo's strict TDD: write failing tests first.

- **Registry**: free-stack constant ordering; `getModelsForProvider('openrouter')` includes the sentinel + free models.
- **use-generate (free-stack expansion)**: extract `buildOpenRouterModel` into a pure, unit-testable helper (mirrors how `buildTextInput` was extracted into `audio-message.ts`). Test that the sentinel id produces `{ primary, models: rest, provider: { sort: 'throughput' } }` and that a normal id passes through untouched. Mock the provider instance.
- **defaults**: `DEFAULT_SUGGESTIONS_CONFIG` is openrouter + free-stack and still `enabled: false`.

Run: `pnpm --filter @september/web test`, then `lint` and `build`.

## Verification (end-to-end)

1. `pnpm --filter @september/web dev`; use the preview tools.
2. Fresh account (clear IndexedDB): confirm suggestions are **off** and, when the
   settings UI is opened, the suggestions model shows **"Free (recommended)"** with
   provider OpenRouter pre-selected.
3. Connect OpenRouter (OAuth) in `/settings/providers`, enable suggestions, trigger
   a suggestion. Inspect the network request to `openrouter.ai/api/v1/chat/completions`
   (preview_network): body should contain `models: [...]` and `provider.sort:
   "throughput"` and a `:free` primary model. Response `model` field should be a `:free` model.
4. Switch the picker to a specific model (e.g. Claude Haiku 4.5); confirm the request
   uses that single model with **no** `models` array.

## Risks / open questions

- **Structured output on free models.** Suggestions use `generateObject` (schema).
  Not all free models support strict JSON/structured output equally; a fallback hop
  could degrade output quality. Mitigation to evaluate during verification: add
  `provider: { require_parameters: true }` so OpenRouter only routes to hosts
  supporting the request's params. Decide based on observed behavior in step 3.
- **Free model IDs rotate.** The four IDs are current as of today; they live in one
  constant (`OPENROUTER_FREE_STACK`) so refreshing is a one-line change. Keep the
  curated list small.
- **Account-wide free-tier caps** still apply (OpenRouter limits free usage globally
  per account); the fallback stack only mitigates per-model 429s, not the daily cap.
  Out of scope to handle here.
