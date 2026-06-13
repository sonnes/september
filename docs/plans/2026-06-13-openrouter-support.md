# OpenRouter Support + "Login with OpenRouter" — Implementation Plan

## Context

September lets each user bring their own AI key, stored locally (IndexedDB, no September backend — `useCurrentUser` returns a guest `LOCAL_USER`). Today the only cloud text provider is **Google Gemini**, which forces every user (often a non‑technical caregiver) to create a Google AI Studio key and paste it. That's the single biggest onboarding wall.

**OpenRouter** fixes both problems at once:
1. **One key → 300+ models** (Claude, Gemini, GPT, Llama…), so users get model choice without juggling N provider keys.
2. **OAuth PKCE "Connect with OpenRouter"** — one click obtains a *user‑controlled* API key (billed to the user's own OpenRouter credits) with no manual copy‑paste, and stays fully local‑first (no September server identity).

**Decisions (confirmed with user):**
- **Login scope:** *Connect provider only.* OAuth is used purely to obtain & store the user's OpenRouter key in their local account. App stays guest/local‑first; `LOCAL_USER` is untouched.
- **Feature scope:** OpenRouter powers **suggestions + keyboard generation** *and* **transcription**. (Speech/TTS unchanged.)

## Findings that shape the plan

- **Client‑side LLM calls are already the norm.** [use-generate.ts](../../work/september/packages/ai/hooks/use-generate.ts) runs in `'use client'` and creates the Gemini provider in‑browser with the user's key. OpenRouter slots in the same way — `createOpenRouter({apiKey})` returns a callable provider (`openrouter(modelId)`), identical shape to `createGoogleGenerativeAI`.
- **The provider UI is registry‑driven.** Adding one entry to `AI_PROVIDERS` ([registry.ts](../../work/september/packages/ai/lib/registry.ts)) auto‑generates the settings card *and* the `openrouter_api_key` / `openrouter_base_url` form fields (dynamic schema in [types/schemas.ts](../../work/september/packages/ai/types/schemas.ts)). No form plumbing needed.
- **Analytics `provider` is a free string** (`z.string().default('gemini')`, [packages/analytics/events.ts](../../work/september/packages/analytics/events.ts)), so we can pass `'openrouter'` directly; the `provider === 'gemini' ? 'gemini' : undefined` guard in use-generate is just overly narrow.
- **Transcription is currently dormant.** [api/transcribe/route.ts](<../../work/september/apps/web/app/api/transcribe/route.ts>) uses a **server env `GEMINI_API_KEY`** (not the user's key), and its client caller was removed when the recording package was deleted (commit `daefebd`). What remains is the settings form + an orphaned route. So "OpenRouter for transcription" means: make transcription **provider‑configurable + user‑key‑based**, implemented client‑side through `useGenerate` (consistent with suggestions). The live mic‑capture UI is a separate follow‑up — see *Out of scope*.

---

## Implementation (TDD — write the failing test first for each lib/hook change)

### Part 0 — Groundwork (deps + types)

1. **Dep:** add `@openrouter/ai-sdk-provider` to [packages/ai/package.json](../../work/september/packages/ai/package.json). **Pin the release whose peer dep matches the `ai` version `@september/ai` resolves** (lockfile shows `ai@5.0.116`; note there's also an `ai@6` copy in the `apps/web` tree — verify the resolved major before pinning, see Risks).
2. **Type union:** add `'openrouter'` to `AIProvider` — [packages/shared/types/ai-config.ts:9](../../work/september/packages/shared/types/ai-config.ts#L9).
3. **Account persistence:** add `openrouter: { api_key?, base_url? }` to `ProvidersSchema` — [packages/account/schema.ts:52-77](../../work/september/packages/account/schema.ts#L52-L77).

### Part 1 — OpenRouter as a generation provider (suggestions + keyboard gen)

4. **Registry entry** in [registry.ts](../../work/september/packages/ai/lib/registry.ts):
   ```ts
   openrouter: {
     id: 'openrouter',
     name: 'OpenRouter',
     description: 'One key for 300+ models (Claude, Gemini, GPT, Llama). Connect in one click.',
     features: ['ai', 'transcription'],
     requires_api_key: true,
     api_key_url: 'https://openrouter.ai/keys',
     oauth: true,                       // NEW optional flag → renders the Connect button (Part 2)
     models: [ /* curated, verify exact IDs at openrouter.ai/models */
       // default cheap + structured-output + audio-capable for transcription:
       { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Fast & cheap' },
       { id: 'google/gemini-2.5-flash',      name: 'Gemini 2.5 Flash' },
       { id: 'anthropic/claude-haiku-4.5',   name: 'Claude Haiku 4.5' },
       { id: 'openai/gpt-5.2-mini',          name: 'GPT-5.2 mini' },
     ],
   }
   ```
   Add optional `oauth?: boolean` to `AIServiceProvider` in [ai-config.ts:176](../../work/september/packages/shared/types/ai-config.ts#L176).

5. **Provider instantiation** in [use-generate.ts:114-123](../../work/september/packages/ai/hooks/use-generate.ts#L114-L123): add
   ```ts
   } else if (provider === 'openrouter') {
     return createOpenRouter({
       apiKey: apiKey || '',
       headers: { 'HTTP-Referer': 'https://september.to', 'X-Title': 'September' },
     });
   }
   ```
   And replace both `provider: provider === 'gemini' ? 'gemini' : undefined` analytics fields ([L176](../../work/september/packages/ai/hooks/use-generate.ts#L176), [L201](../../work/september/packages/ai/hooks/use-generate.ts#L201)) with `provider`.

6. **Make it selectable for suggestions** (keyboard‑gen inherits this — it reads `suggestionsConfig.provider`):
   - `SuggestionsConfigSchema.provider` enum `['gemini','webllm']` → add `'openrouter'` — [account/schema.ts:5](../../work/september/packages/account/schema.ts#L5).
   - `SuggestionsConfig.provider` type — [ai-config.ts:37](../../work/september/packages/shared/types/ai-config.ts#L37).
   - Suggestions provider dropdown filter — add `'openrouter'` in [suggestions-form.tsx:100-106](../../work/september/packages/suggestions/components/suggestions-form.tsx#L100-L106).

### Part 2 — Login with OpenRouter (OAuth PKCE, fully client‑side)

7. **New lib** `packages/ai/lib/openrouter-oauth.ts` (+ `openrouter-oauth.test.ts` first). Pure browser crypto, no new deps (`crypto.getRandomValues` + `crypto.subtle.digest` + `btoa`→base64url):
   ```ts
   generatePkcePair(): Promise<{ verifier: string; challenge: string }> // challenge = base64url(sha256(verifier))
   buildAuthorizeUrl({ callbackUrl, challenge }): string
     // https://openrouter.ai/auth?callback_url=<cb>&code_challenge=<c>&code_challenge_method=S256
   exchangeCodeForKey({ code, verifier }): Promise<string>
     // POST https://openrouter.ai/api/v1/auth/keys  body {code, code_verifier, code_challenge_method:'S256'} → { key }
   startOpenRouterAuth(callbackUrl): Promise<void>   // make pair, sessionStorage.set verifier, location.assign(authorizeUrl)
   completeOpenRouterAuth(code): Promise<string>     // read verifier, exchange, clear storage, return key
   ```
   Tests: challenge == base64url(sha256(verifier)); authorize‑URL shape; exchange parses `{key}` (mock `fetch`); throws when verifier missing / non‑200.

8. **Connect button** in [provider-section.tsx](../../work/september/packages/ai/components/provider-section.tsx) right column (above the API‑key field), rendered only when `provider.oauth`:
   *"Connect with OpenRouter"* → `startOpenRouterAuth(window.location.href)`. The manual API‑key field stays as a fallback.

9. **Handle the callback on the existing providers page** (no new route — page already has account access and is the desired landing spot). In [settings/providers/form.tsx](<../../work/september/apps/web/app/(app)/settings/providers/form.tsx>): on mount, if `useSearchParams().get('code')` is present → `completeOpenRouterAuth(code)` → `updateAccount({ ai_providers: { ...account.ai_providers, openrouter: { api_key: key } } })` → toast success → strip `?code` from the URL (`router.replace('/settings/providers')`).
   `callback_url` resolves to `${origin}/settings/providers`, which satisfies OpenRouter's rule (https:443 in prod `september.to`; `localhost:3000` in dev).

### Part 3 — Transcription via OpenRouter (user key, client‑side)

10. **Teach `useGenerate` to accept audio** (smallest reuse — keeps one provider switch, key handling, analytics): add optional `audio?: { data: Uint8Array | string; mediaType: string }` to `GenerateTextParams` ([use-generate.ts:42](../../work/september/packages/ai/hooks/use-generate.ts#L42)). In the text branch, when `audio` is set, call `generateText` with a multimodal message instead of `prompt`:
    ```ts
    messages: [{ role: 'user', content: [
      { type: 'file', data: audio.data, mediaType: audio.mediaType },
      { type: 'text', text: prompt },
    ]}]
    ```
    Works for both `openrouter` (multimodal chat model) and `gemini` (`@ai-sdk/google` file parts) with the **user's** key.

11. **Transcription config becomes provider‑configurable:**
    - `TranscriptionConfigSchema.provider` `z.literal('gemini')` → `z.enum(['gemini','openrouter'])` — [account/schema.ts:20](../../work/september/packages/account/schema.ts#L20).
    - `TranscriptionConfig.provider` type — [ai-config.ts:60](../../work/september/packages/shared/types/ai-config.ts#L60).
    - [transcription-form.tsx](../../work/september/packages/ai/components/transcription-form.tsx): add a Provider `FormSelect` from `getProvidersForFeature('transcription')`; model list from `getModelsForProvider(provider)`.

12. **Thin transcription helper** in `@september/ai` (e.g. `useTranscribe`) that reads `transcriptionConfig`, converts a `Blob` → bytes, and calls `generate({ prompt: TRANSCRIPTION_PROMPT, audio, feature: 'transcription' })`. The legacy server route + `GeminiService.transcribeAudio` are left untouched (now unused; do not delete per project rules — note as dead code).

### READMEs (project rule)
Update module READMEs touched: `packages/ai`, `packages/account`, `packages/shared`, `packages/suggestions`.

---

## Files touched (summary)

| Area | File | Change |
|---|---|---|
| dep | `packages/ai/package.json` | add `@openrouter/ai-sdk-provider` (version‑matched) |
| types | `packages/shared/types/ai-config.ts` | `'openrouter'` in `AIProvider`; `oauth?` on `AIServiceProvider`; provider unions for suggestions/transcription |
| registry | `packages/ai/lib/registry.ts` | `openrouter` entry (features `ai`+`transcription`, `oauth:true`, curated models) |
| gen hook | `packages/ai/hooks/use-generate.ts` | `createOpenRouter` branch; analytics `provider`; optional `audio` multimodal path |
| oauth | `packages/ai/lib/openrouter-oauth.ts` (+ test) | **new** PKCE lib |
| settings UI | `packages/ai/components/provider-section.tsx` | "Connect with OpenRouter" button when `provider.oauth` |
| callback | `apps/web/app/(app)/settings/providers/form.tsx` | detect `?code` → exchange → `updateAccount` → strip query |
| account | `packages/account/schema.ts` | `openrouter` in `ProvidersSchema`; suggestions+transcription provider enums |
| suggestions | `packages/suggestions/components/suggestions-form.tsx` | add `openrouter` to provider filter |
| transcription | `packages/ai/components/transcription-form.tsx` + new `useTranscribe` | provider selector + client transcribe helper |

---

## Verification

**Automated (TDD, run `pnpm test`):**
- `openrouter-oauth.test.ts`: PKCE challenge correctness, authorize‑URL build, code→key exchange (mock `fetch`), error paths.
- `use-generate` audio path: with `audio` set, asserts a multimodal `messages` payload is built (mock the AI SDK), provider switch returns the OpenRouter instance for `provider:'openrouter'`.
- Schema tests: account round‑trips `ai_providers.openrouter`; suggestions/transcription accept `provider:'openrouter'`.

**Manual (`pnpm --filter @september/web dev`):**
1. `/settings/providers` → **Connect with OpenRouter** → authorize → redirected back, key saved, card shows **Configured**.
2. `/settings/suggestions` → set provider **OpenRouter**, pick a model, enable.
3. In a chat: typing yields suggestions; first message triggers keyboard generation (exercises `generateObject` — confirm the chosen model supports structured output).
4. Transcription (no mic UI yet): integration test feeds an audio fixture Blob through `useTranscribe` and asserts non‑empty text from OpenRouter with the user's key.

---

## Risks & open questions
- **`ai` version skew:** lockfile has `ai@5.0.116` (used by `@september/ai`) but an `ai@6.0.199` copy exists under `apps/web`. Confirm the major that `@september/ai` actually resolves and pin the matching `@openrouter/ai-sdk-provider` line; align if needed.
- **Exchange CORS:** plan does the `/api/v1/auth/keys` POST client‑side (OpenRouter documents this for local‑first apps). If a browser CORS block appears, fallback is a thin proxy route `apps/web/app/api/auth/openrouter/route.ts` (pass‑through only, stores nothing).
- **Structured outputs:** keyboard‑gen uses `generateObject`; curate models that support JSON‑schema output (the OpenRouter provider also ships a response‑healing plugin). Verify with the default model.
- **COEP/COOP headers** (`next.config.ts`, for WebLLM isolation) don't block top‑level redirects or CORS `fetch`; confirm during manual test.

## Out of scope (flagged for user)
- **Live mic‑capture → transcription UI.** The recorder that fed `/api/transcribe` was deleted; this plan delivers the transcription *capability* (config + user‑key client path + tests), not a new in‑conversation recording control. Can be a fast follow‑up if wanted.
- App‑level sign‑in/identity via OpenRouter (explicitly declined — connect‑only).
- Speech/TTS provider changes.
