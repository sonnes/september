# @/packages/usage

Client-side metering for the September app. Every outbound provider call is
priced on the way in and read back through TanStack Query for the dashboard and
usage page. Browser builds store events in IndexedDB. Desktop builds store them
in the local-only `analytics-events` SQLite collection through Rust RPC.
Nothing leaves the device.

## Public API

```ts
import {
  DashboardStats,
  ProviderSpendChip,
  UsageReport,
  formatCost,
  recordApiCall,
  track,
} from '@/packages/usage';
import type { ApiCall, Cost, CostSource, GenerationFeature, TrackedEvent } from '@/packages/usage';
```

Everything else (`analyticsCollection`, `useAnalyticsSummary`, `useRecentCalls`,
`useElevenLabsQuota`, the price table, individual components) is internal.

### `recordApiCall(userId, call)`

The entry point for **provider calls**. Fire-and-forget: prices the call, then
delegates to `track()`. Callers pass raw units; they never compute cost.

```ts
recordApiCall(userId, {
  kind: 'llm',
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
  feature: 'suggestions',
  input_tokens: 412,
  output_tokens: 38,
  latency_ms: 410,
  success: true,
});

recordApiCall(userId, {
  kind: 'speech',
  provider: 'elevenlabs',
  model: 'eleven_flash_v2_5',
  characters: 96,
  latency_ms: 280,
  success: true,
});

recordApiCall(userId, {
  kind: 'clone',
  provider: 'elevenlabs',
  clone_kind: 'clone',
  sample_count: 3,
  latency_ms: 5400,
  success: true,
});
```

`reported_cost_usd` (OpenRouter) wins over the price table and marks the call
`measured`. `cached: true` records the call at $0 — it never reached a provider.

Most callers do **not** call this directly:

| Call path                 | Metered by                                                 |
| ------------------------- | ---------------------------------------------------------- |
| Every language-model call | `meteringMiddleware` in `@/packages/ai`                    |
| Every text-to-speech call | `meterSpeech` in `@/packages/speech`                       |
| On-device transcription   | `useTranscribe` (no model call to wrap)                    |
| Voice cloning             | `cloneVoice` / `findSimilarVoices` in `@/packages/cloning` |

### `track(userId, event)`

Unchanged, still fire-and-forget. Used directly only for `message_sent`; the
provider-call events are better reached through `recordApiCall`.

### `TrackedEvent`

Discriminated union on `type`:

| type             | required fields                                            | optional fields                                                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `message_sent`   | `text_length`                                              | `space_id`, `keys_typed` (default 0)                                                                                                                                                                                                               |
| `ai_generation`  | `input_length`, `output_length`, `latency_ms`, `success`   | `generation_type` (default `suggestions`), `provider` (default `gemini`), `model` (default `gemini-2.5-flash-lite`), `input_tokens`, `output_tokens`, `cached_input_tokens`, `audio_seconds`, `cached`, `cost_usd`, `cost_source`, `error_message` |
| `tts_generation` | `text_length`, `duration_seconds`, `latency_ms`, `success` | `provider` (default `elevenlabs`), `model`, `voice_id`, `credits`, `cost_usd`, `cost_source`, `error_message`                                                                                                                                      |
| `voice_clone`    | `clone_kind`, `sample_count`, `latency_ms`, `success`      | `provider` (default `elevenlabs`), `error_message`                                                                                                                                                                                                 |

`generation_type` is one of `suggestions`, `transcription`, `summary`,
`extraction`, `phrases`, `context`.

## Three units, not one invented dollar

Providers bill in different shapes, so a cost carries its `CostSource`:

| Source      | Means                                     | Comes from                           |
| ----------- | ----------------------------------------- | ------------------------------------ |
| `measured`  | The provider reported this exact charge   | OpenRouter usage accounting          |
| `estimated` | Tokens × our price table                  | Gemini                               |
| `quota`     | Prepaid credits, no per-call price        | ElevenLabs                           |
| `free`      | Ran on this device, or a `:free` model    | Kokoro, Whisper, WebLLM, browser TTS |
| `unknown`   | No price on file — counted, never guessed | Any unlisted model                   |

`formatCost` renders `unknown`/`quota` as `—`, and keeps sub-cent amounts
visible (`$0.00006`) so a fraction of a cent never reads as free. Only `measured`
and `estimated` calls contribute to a spend total.

### Price table (`lib/pricing.ts`)

Prices are **stamped at write time**, so an event keeps the price of the day it
happened; the dashboard never re-prices history. The table was checked on
**2026-07-26** — re-check it when a provider changes pricing:

- Gemini — <https://ai.google.dev/gemini-api/docs/pricing> (paid tier). Audio
  input has its own rate, used when `feature === 'transcription'`.
- ElevenLabs — Flash/Turbo bill 0.5 credits per character, Multilingual v2 and
  v3 bill 1.0. The authoritative per-model rate is `GET /v1/models` →
  `model_rates.character_cost_multiplier`.

Known limits: `cached_input_tokens` is recorded but priced at the standard input
rate (Gemini discounts implicit cache hits, so an estimate can run high), and a
free-tier key is estimated as if it were paid.

## Components

```tsx
<DashboardStats userId={user?.id} />                 // Efficiency + Spend, on /dashboard
<UsageReport userId={user?.id} />                    // the whole /settings/usage page
<ProviderSpendChip provider="gemini" userId={id} />  // running cost beside a key
```

`DashboardStats` shows two cards: communication efficiency and spend. The spend
card leads with money, keeps tokens as its supporting line, and shows prepaid
voice credits as their own meter. `UsageReport` adds the per-service table,
per-feature bars, the ElevenLabs plan, the recent-call log and a CSV export.

The browser downloads the CSV through an anchor. The desktop build sends the
CSV bytes to Rust and shows a native save dialog.

## Stored-data model

Events are stored in IndexedDB with this shape (backwards-compatible; do not
change without a migration):

```
{ id: uuid, user_id: string, event_type: string, timestamp: Date, data: {...} }
```

- **Browser database:** `analytics`
- **Store:** `analytics_events`
- **Version:** 1
- **Collection id:** `analytics-events`
- **BroadcastChannel:** `analytics-collection`
- **Query indexes:** `timestamp`, `user_id`

Desktop builds store the same event object as a JSON record. Analytics is not
in the Rust sync allowlist, so these rows never enter the cloud-sync outbox.

Cost fields were added in July 2026 as optional fields with permissive defaults,
so events written before then still parse — they report `cost_source: 'unknown'`
and render a dash rather than being back-filled with a made-up price.

`duration_seconds` on TTS events is now recorded as `0` unless genuinely known;
the previous value was inferred from blob size and was never a real duration.
There is no pruning — events accumulate for as long as the browser keeps them.
