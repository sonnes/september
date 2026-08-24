# Token & cost usage for every API call

- **Mock:** `docs/mocks/2026-07-26-usage-cost.html`
- **Notes file (during implementation):** `docs/notes/2026-07-26-token-cost-usage.md`
- **Status:** Phases 1–7 implemented (2026-07-26); Phase 8 deferred, needs approval
- **Touches:** `@/packages/usage` (most of it), `@/packages/ai`, `@/packages/speech`, `@/packages/cloning`, `routes/_app/settings/*`, `routes/_app/dashboard.tsx`

September runs on the user's own API keys. Google, OpenRouter and ElevenLabs bill them directly, and
today the app gives them no way to know how much. `@/packages/usage` already records tokens for _some_
calls; this plan meters **all** of them and puts a price on the ones that have one.

One thesis: **one meter, one price table, one store — and three honest units.**

1. **One meter.** An AI SDK `LanguageModelMiddleware` catches every LLM call (success, failure, cache hit)
   without a `track()` call at each site; one wrapper in `use-speech` catches every TTS engine; one direct
   call catches voice cloning.
2. **One price table.** `usage/lib/pricing.ts`, keyed `provider:model`, returning `{ amount_usd, source }`.
   Cost is **stamped at write time**, so an event keeps the price of the day it happened.
3. **Three units, never one invented dollar.** Tokens → dollars for Gemini/OpenRouter; **credits against a
   prepaid allowance** for ElevenLabs (a per-call dollar price does not exist on that plan); **free** for
   on-device Kokoro/Whisper/WebLLM/browser TTS — where zero is the reward, not the absence of data.

## Scope — the nine billed paths

| Call path | Provider | Unit | Today | After |
| --- | --- | --- | --- | --- |
| `useGenerate` (suggestions, phrases, space context) | Gemini / OpenRouter | tokens | success only, no cost, cache hits double-counted | middleware, incl. failures + cache hits at $0 |
| `useTranscribe` — cloud | Gemini / OpenRouter | tokens | same path | same middleware |
| `useTranscribe` — whisper | on device | free | untracked | free event with audio seconds |
| `extractText` (file → note) | Gemini 2.5 Flash | tokens | **untracked** | same middleware |
| TTS REST `generateSpeech` | ElevenLabs | credits | provider/model/chars wrong | chars + credits + quota |
| TTS WS `generateSpeechStream` | ElevenLabs | credits | `duration_seconds` hard-coded 0 | same wrapper as REST |
| TTS Gemini / Kokoro / browser | Gemini / on device | tokens / free | all mislabelled `elevenlabs` | correct provider + free |
| `cloneVoice`, `findSimilarVoices` | ElevenLabs | voice slot | **untracked** | counted, cost `unknown` (not metered) |
| Failed / rate-limited calls | all | may still burn tokens | **untracked** | recorded with `success: false` |

Not billed, out of scope: `listVoices`, OpenRouter OAuth exchange, `sync/lib/api-client.ts` (our own
backend), static asset fetches.

## Decisions (defaults — override at approval)

| Question | Decision |
| --- | --- |
| Where does cost come from? | Three sources, labelled in the UI: **measured** (OpenRouter returns the exact charge per call), **estimated** (local price table × tokens), **quota** (ElevenLabs prepaid credits), **free** (on device), **unknown** (no price for that model — show `—`, never guess). |
| Stamp or compute? | **Stamp `cost_usd` at write time.** Prices drift; recomputing history against today's table silently rewrites the past. |
| New event type or extend? | **Extend.** `ai_generation` and `tts_generation` gain a shared cost trailer; add one new `voice_clone` type. Optional fields on a zod discriminated union — no IndexedDB migration, old rows keep parsing. |
| Middleware or call sites? | **Middleware.** New LLM call paths get metered the day they are written. It also fixes the current cache double-count. |
| Cache hits | Recorded as a real event with `cached: true`, zero tokens, `$0.00` — "Reused answer" in the UI. Today they re-report the cached token usage and inflate the totals. |
| ElevenLabs in dollars? | **No.** Credits against the plan allowance, read from `GET /v1/user/subscription` (authoritative, not estimated). Dollars only if we later handle overage. |
| Detail page location | New `/settings/usage` section. The dashboard stays two calm cards; the per-call log, CSV and price provenance are caregiver/admin work and belong beside the keys. (Alternative considered: fold it all into `/dashboard` — rejected, it turns a calm screen into a console.) |
| Data leaves the device? | **Never.** Same local IndexedDB store as today. The only new network calls are one ElevenLabs subscription read on the Usage page. |
| Old events | Show tokens, `—` for cost. No back-fill with a made-up price. |

## TDD discipline

Every phase: write failing tests → run (`pnpm -C apps/web test`) → implement minimum → green.
Before each commit: `pnpm -C apps/web lint && pnpm -C apps/web test && pnpm -C apps/web build`.
Read and update the `README.md` of every module touched (`usage`, `ai`, `speech`, `cloning`).

---

## Phase 1 — Price table (`@/packages/usage/lib/pricing.ts`)

**Files:** `lib/pricing.ts` (new), `lib/pricing.test.ts` (new), `README.md`.

Pure data + pure functions, no React, no I/O.

```ts
export type CostSource = 'measured' | 'estimated' | 'free' | 'quota' | 'unknown';

export interface TokenPrice { input_per_mtok: number; output_per_mtok: number; cached_input_per_mtok?: number }
export interface CharPrice  { credits_per_char: number }   // ElevenLabs model rate

export interface Cost { amount_usd?: number; source: CostSource }

export function costOfTokens(provider: string, model: string, u: { input: number; output: number; cached?: number }): Cost;
export function costOfSpeech(provider: string, model: string, characters: number): { credits?: number } & Cost;
export function formatCost(amount?: number, source?: CostSource): string;   // '$0.09' | '<$0.0001' | '$0.00' | '—'
export function formatUnits(...): string;                                   // '486k in · 92k out', '74,120 chars → 37,060 cr'
```

1. `TOKEN_PRICES: Record<string, TokenPrice>` keyed `` `${provider}:${model}` `` — Gemini models we ship
   (`gemini-2.5-flash-lite`, `gemini-2.5-flash`, the two TTS previews). **OpenRouter models are deliberately
   absent**: OpenRouter reports its own cost, so estimating is both unnecessary and wrong.
2. `ELEVENLABS_RATES: Record<string, CharPrice>` — `characterCostMultiplier` per model
   (`eleven_flash_v2_5`, `eleven_turbo_v2_5`, `eleven_multilingual_v2`, `eleven_v3`).
3. `FREE_PROVIDERS = ['webllm', 'kokoro', 'whisper', 'browser']` → always `{ amount_usd: 0, source: 'free' }`.
   OpenRouter model ids ending `:free` also resolve to `free`.
4. Unknown key → `{ source: 'unknown' }` with **no** `amount_usd`. Never fall back to a sibling model's price.
5. `formatCost` renders `—` for `unknown`/`quota`, `$0.00` for `free`, `<$0.0001` for non-zero sub-threshold.

**Verify before shipping (do not copy the numbers from this plan):**

- Gemini per-token prices from Google's current pricing page.
- ElevenLabs multipliers from `GET https://api.elevenlabs.io/v1/models` → `model_rates.character_cost_multiplier`
  (one manual `curl` with a real key). Record the date checked in a comment at the top of the table plus in
  `docs/notes/2026-07-26-token-cost-usage.md`.

**Tests:** known model → exact dollars for a known token count; unknown model → `source: 'unknown'` and no
amount; `:free` suffix → `free`; on-device provider → `free`; ElevenLabs → credits = chars × multiplier and
`source: 'quota'` with no `amount_usd`; every `formatCost` branch.

**Verify:** `pnpm -C apps/web test pricing`.

---

## Phase 2 — Event schema + `recordApiCall` (`@/packages/usage`)

**Files:** `store.ts`, `store.test.ts`, `README.md`.

Shared trailer, added to both existing provider-call events (all optional → backwards compatible):

```ts
provider: string;                 // already there, but stop defaulting it
model: string;                    // add to tts_generation
cost_usd?: number;
cost_source: CostSource;          // default 'unknown' so old rows parse
cached?: boolean;                 // default false
```

1. `AIGenerationStoredSchema.data`: add `cached_input_tokens?`, `cost_usd?`, `cost_source` (default
   `'unknown'`), `cached` (default `false`); widen `generation_type` to
   `'suggestions' | 'transcription' | 'summary' | 'extraction' | 'phrases' | 'context'` (default stays
   `'suggestions'`, so existing rows are untouched).
2. `TTSGenerationStoredSchema.data`: add `model` (default `'unknown'`), `characters`, `credits?`,
   `cost_usd?`, `cost_source` (default `'unknown'`). Keep `duration_seconds` for the existing dashboard;
   stop inventing it from blob size — record `0` when not known and mark it as such in the README.
3. New `VoiceCloneStoredSchema` — `{ provider, kind: 'clone' | 'similar', sample_count, latency_ms, success, error_message? }`,
   added to the `AnalyticsEventSchema` union. No cost fields: it consumes a voice slot, not metered units.
4. `TrackedEvent` union gains the same fields; `track()` gains the new branch.
5. `recordApiCall(userId, call)` — the one entry point the meters use. Takes raw usage
   (`{ kind: 'llm' | 'speech' | 'clone', provider, model, feature, tokens?, characters?, latency_ms, success, cached?, reported_cost_usd? }`),
   asks `pricing.ts` for the cost (`reported_cost_usd` wins → `source: 'measured'`), and delegates to `track()`.
   Keep `track()` exported and unchanged for `message_sent`.

**Tests:** a pre-cost-tracking row (no `cost_source`, no `model`) still parses; `recordApiCall` with an
OpenRouter reported cost → `source: 'measured'` and that exact amount; with Gemini tokens → `estimated` and
the table's amount; with an unknown model → `unknown`, no amount, **usage still recorded**; failure → an
event with `success: false`; clone → `voice_clone` row.

**Verify:** `pnpm -C apps/web test usage`.

---

## Phase 3 — Meters at the three choke points

### 3a — LLM middleware (`@/packages/ai/lib/metering.ts`, new)

**Files:** `lib/metering.ts` (new), `lib/metering.test.ts` (new), `lib/middleware.ts`, `hooks/use-generate.ts`, `lib/extract-text.ts`, `lib/openrouter-model.ts`, `README.md`.

1. `meteringMiddleware({ userId, provider, model, feature })` → `LanguageModelMiddleware` with `wrapGenerate`:
   - `const cached = hasCached(params)` **before** calling `doGenerate()`;
   - `await doGenerate()` inside `try/catch`; on throw, record `success: false` with zero tokens and rethrow
     (the toast at the call site is unchanged);
   - read `usage.inputTokens` / `outputTokens` and, when present,
     `providerMetadata.openrouter.usage.cost` → `reported_cost_usd`;
   - one `recordApiCall(...)`, fire-and-forget.
2. `lib/middleware.ts`: export `cacheKeyFor(params)` and `hasCached(params)` alongside `cacheMiddleware`, so
   the meter can classify a hit without a shared mutable flag. (A concurrent generate resolving between the
   check and the call can mis-label a hit as a miss — harmless, note it in the README.)
3. `use-generate.ts`: `wrapLanguageModel({ model: baseModel, middleware: [meteringMiddleware({...}), cacheMiddleware] })`
   — the meter is **outermost** so cache hits are still recorded. Delete the two inline `track()` blocks.
4. `openRouterModelArgs`: add `usage: { include: true }` to the returned settings (both the free-stack and
   pass-through branches) so OpenRouter returns its exact cost. Update its test.
5. `extract-text.ts`: take an optional `{ userId }` and wrap its model with the same middleware
   (`feature: 'extraction'`); `use-file-upload.ts` passes the id.
6. Pass real features: `use-generate-space-phrases` → `'phrases'`, `use-generate-space-context` → `'context'`,
   `use-suggestions` → `'suggestions'` (explicit, not the default).
7. `wrapStream` is **not** implemented — no LLM path streams today. Add a one-line README note so the gap is
   known rather than discovered.

**Tests** (fake `doGenerate`): success records tokens + provider + model + feature; throwing `doGenerate`
records `success: false` and rethrows; a primed cache records `cached: true` with zero tokens and `$0.00`;
OpenRouter provider metadata → `measured` cost passed through verbatim.

### 3b — Speech wrapper (`@/packages/speech/hooks/use-speech.ts`)

**Files:** `hooks/use-speech.ts`, `hooks/use-speech.test.ts` (new or extended), `README.md`.

1. One local `meterSpeech(text, engineId, model, startedAt, promise)` used by **both** `generateSpeech` and
   `generateSpeechStream`, replacing the two divergent `.then(track)` blocks.
2. Fix the provider bug — record `speechConfig.provider` (elevenlabs / gemini / kokoro / browser), not
   `elevenlabs ?? default`. Record `model` from `settings.model_id` and `characters = text.length`.
3. `.catch` also records (`success: false`), including the WS→REST fallback path so a failed socket attempt
   is visible.

**Tests:** kokoro → `provider: 'kokoro'`, `source: 'free'`; elevenlabs `eleven_flash_v2_5` with 96 chars →
48 credits, `source: 'quota'`, no `amount_usd`; a rejected promise → a `success: false` event.

### 3c — Whisper + cloning

**Files:** `ai/hooks/use-transcribe.ts`, `cloning/components/form.tsx`, `cloning/README.md`.

1. Whisper path: `recordApiCall({ kind: 'llm', provider: 'whisper', model, feature: 'transcription', ... })`
   with audio seconds and `source: 'free'` — so "ran on this device, cost nothing" is visible rather than absent.
2. `cloneVoice` / `findSimilarVoices` call sites: one `recordApiCall({ kind: 'clone', ... })` each, success
   and failure.

**Verify (whole phase):** `pnpm -C apps/web test` green; then `pnpm -C apps/web dev`, speak a sentence, take a
suggestion, transcribe a clip, upload a file to a note, and confirm one event per call in
IndexedDB → `analytics` → `analytics_events` with a sane `cost_source`.

---

## Phase 4 — Read model (`@/packages/usage`)

**Files:** `use-summary.ts`, `aggregate.test.ts`, `hooks/use-elevenlabs-quota.ts` (new), `README.md`.

1. Extend `summarizeAnalyticsEvents` (keep the existing `messages` / `ai_generations` / `tts_generations`
   shape so today's dashboard cards keep working) with:
   ```ts
   spend: {
     total_usd: number;                 // measured + estimated only
     by_provider:  Record<string, { calls: number; cost_usd: number; source: CostSource; input_tokens: number; output_tokens: number; characters: number; credits: number }>;
     by_model:     Record<string, {...same}>;      // key `provider:model`
     by_feature:   Record<string, { calls: number; cost_usd: number }>;
     failed_calls: number;
     cached_calls: number;
     unknown_price_models: string[];    // drives the honest "no price for X" callout
   }
   ```
   One pass over the events, same generic style as `aggregateByProvider`.
2. `useRecentCalls({ userId, limit })` — a live query over the same collection, newest first, mapped to a flat
   row shape for the table.
3. `useElevenLabsQuota()` — `GET /v1/user/subscription` with the stored key; returns
   `{ used, limit, resets_at, tier }` in the standard `{ data, isLoading, error }` shape. Returns `undefined`
   with no key, never throws into the UI, one fetch per mount.

**Tests:** mixed-source events → `total_usd` counts measured + estimated and **excludes** quota/unknown;
`unknown_price_models` lists the offenders; cached and failed counts; empty range → zeroed struct, not
`undefined`.

---

## Phase 5 — Dashboard Spend card

**Files:** `usage/components/spend-card.tsx` (new), `usage/components/dashboard-stats.tsx`, `usage/index.ts`, `README.md`.

Mock: Screen A. The Efficiency card is untouched; the "AI tokens" card is **replaced** by Spend (tokens
survive as its supporting line, so nothing is lost).

1. Hero `$0.18` + caption "on pay-as-you-go AI this month — 847k tokens across 3,858 calls. Charged by your
   providers to your own keys; September never bills you."
2. Right column: provider split bar + rows with a source badge each, an "On this device — free" row, and the
   ElevenLabs credits meter under a divider.
3. Footer line naming the estimate's provenance; `See every call →` links to `/settings/usage`.
4. Empty state: "No calls yet this month" (mock, Screen C).

**Design constraints:** same hero rhythm as the Efficiency card (`text-7xl` number, `rounded-surface`,
`p-8`, `gap-6`). Badge = `@/packages/ui` `Badge`. Colours: indigo primary, `--chart-2`, amber for quota,
emerald for measured — no new tokens. Numbers `tabular-nums`. No hover-only affordances.

**Tests:** extend `dashboard-stats.test.tsx` — renders the total, renders `—` and the explanation when every
event is `unknown`, hides the credits meter when there is no ElevenLabs key.

---

## Phase 6 — `/settings/usage` page

**Files:** `routes/_app/settings/usage.tsx` (new), `components/settings/settings-nav.tsx`,
`usage/components/usage-report.tsx` (new), `usage/components/service-table.tsx` (new),
`usage/components/recent-calls.tsx` (new), `usage/lib/csv.ts` (new) + test, `README.md`.

Mock: Screen B.

1. Nav entry between Listening and Account: **Usage** — "What your services use, and cost."
2. Totals strip (spend · voice credits · tokens · calls-with-failures-and-cache), reusing `TimeRangeSelector`.
3. **By service** table — one row per `provider:model`: used-for, calls, usage, cost, source badge, totals row.
4. **What it went on** — feature bars in plain language (Writing help, Listening, Notes & files, Space memory,
   Speaking-as-credits). The stored `generation_type` → label mapping lives in one exported constant.
5. **ElevenLabs plan** card — credits meter, reset date, projection sentence, all from `useElevenLabsQuota`.
6. **Recent calls** — last 50 with a "Show all" toggle; failure rows read "Busy — retried", cache rows read
   "Reused answer". No raw error strings in the table (the message goes in a tooltip).
7. **CSV export** — `toCsv(events)` in `lib/csv.ts` (pure, tested), downloaded via a blob URL. Columns:
   timestamp, feature, provider, model, input_tokens, output_tokens, characters, credits, cost_usd,
   cost_source, latency_ms, success, cached.
8. Page footer paragraph: where estimates come from, that OpenRouter is exact, that ElevenLabs is prepaid, and
   that the data never leaves the device.

**Tests:** `toCsv` — header, escaping, empty set, missing optional fields; the route renders under the
settings layout; the nav marks Usage active on `/settings/usage`.

**Verify:** `pnpm -C apps/web build`, then click through at all four breakpoints (the table collapses to
stacked rows below `md`).

---

## Phase 7 — Spend chips on the Setup page

**Files:** `routes/_app/settings/-setup-form.tsx`, `usage/components/provider-spend-chip.tsx` (new).

One chip per connected provider in `FreeConnections` / `AdvancedConnections` / `PrivacyConnections`:
`~$0.10 this month` · `37% of credits` · `Always free`. Reads the Phase 4 summary; renders nothing while
loading rather than flashing a zero.

**Tests:** chip renders the right unit per provider family; renders nothing for a provider with no events.

---

## Phase 8 (optional, needs approval) — Spend alert

A soft monthly ceiling — "Warn me when spend passes $5.00" — stored in account settings, surfaced as an amber
`Callout` on the dashboard and Usage page at 80% and 100%. **Never blocks a call**: on this product, silencing
someone to save four cents is the wrong trade. Same for the credits warning at 85%, which offers the on-device
voice as a fallback and nothing more.

---

## Risks and honest limits

- **Price drift.** The Gemini table is a snapshot. Mitigations: everything derived from it is badged
  *Estimated*, the footer names it, and the constant carries its check date. Revisit when Gemini pricing moves.
- **Estimates exclude what we can't see.** Gemini bills audio and cached input differently; a transcription
  estimate can be low. `cached_input_tokens` is recorded when the provider reports it, and the UI never claims
  the number is a bill.
- **Free-tier reality.** Gemini's free tier means an estimated `$0.09` may cost literally nothing. The card
  says "estimated"; a later refinement can let the user mark a key as free-tier.
- **Retention.** Events accumulate in IndexedDB with no pruning today (pre-existing). At roughly 4k
  events/month the Usage page stays fine for years; if it doesn't, prune to 180 days in a follow-up.
- **The `duration_seconds` regression.** Existing TTS rows carry a duration invented from blob size. New rows
  record `0` unless truly known. If the dashboard ever surfaces average duration, it must treat `0` as absent.
