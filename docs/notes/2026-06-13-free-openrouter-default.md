---
title: Free OpenRouter Default — Implementation Notes
plan: ../plans/2026-06-13-free-openrouter-default.md
---

# Implementation notes

Records decisions where the spec was silent, deviations, and reviewer-relevant context. Not a restatement of the plan.

## Decisions / resolutions

- **Single source of truth for free models: `packages/ai/lib/openrouter-model.ts`.** The plan sketched the stack constant living in `registry.ts`. Instead, the free models are defined once as `OPENROUTER_FREE_MODELS` (objects with `id`/`name`/`description`) in a dedicated module; `OPENROUTER_FREE_STACK` derives the id list via `.map`, and `registry.ts` spreads `OPENROUTER_FREE_MODELS` into `openrouter.models`. Avoids duplicating ids between the picker entries and the request-time fallback chain.

- **Sentinel expansion is a pure helper (`openRouterModelArgs`)**, mirroring the `buildTextInput` extraction from the prior OpenRouter work — unit-testable without mounting the hook. Returns `{ id, settings? }`; the free-stack sentinel yields `{ id: primary, settings: { models: rest, provider: { sort: 'throughput' } } }`, any concrete id passes through as `{ id }`. Tested in `openrouter-model.test.ts`.

- **Localized cast in `use-generate.ts`.** `providerInstance` is a union (`createGoogleGenerativeAI(...) | OpenRouterProvider | typeof webLLM | null`), so calling with a second `settings` arg isn't valid across the union. Inside the `provider === 'openrouter'` branch the instance is cast to `ReturnType<typeof createOpenRouter>` to pass `settings`. Other providers keep the plain `providerInstance(modelId)` call.

- **Module-level `DEFAULT_GENERATION_PROVIDER`/`DEFAULT_GENERATION_MODEL` left as gemini.** These are only the implicit fallback when `useGenerate()` is called with no options; suggestions/keyboard always pass explicit config from `suggestionsConfig`. Changing them would also shift transcription's implicit default, which is out of scope.

- **`require_parameters` NOT added (yet).** The plan flagged it as a possible mitigation for structured-output (`generateObject`) support across free models. Deferred — only worth adding if verification shows a free model in the chain failing schema generation. Left out to keep routing permissive.

## Verification status

- Tests: 364 pass, incl. new `openrouter-model.test.ts` + `registry.test.ts`.
- Changed AI files lint clean (repo-wide `eslint .` has a large pre-existing failure count unrelated to this change).
- End-to-end network verification (request body carries `models: [...]` + `provider.sort: "throughput"`, response `model` is a `:free` id) still pending a connected OpenRouter account.
