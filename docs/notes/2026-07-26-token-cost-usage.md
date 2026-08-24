---
plan: docs/plans/2026-07-26-token-cost-usage.md
---

# Notes — token & cost usage

What the plan did not say, decided while building. Phases 1–7 are implemented;
Phase 8 (spend alert) was not started — it needs approval.

## Prices, verified

The plan said verify before shipping; done on 2026-07-26, and two numbers were
**not** what I would have guessed:

- Gemini 2.5 Flash input is **$0.30**/1M, not $0.15 — and both Gemini models
  price audio input separately ($0.30 flash-lite, $1.00 flash) against $2.50/1M
  output on flash. Source: <https://ai.google.dev/gemini-api/docs/pricing>.
- ElevenLabs Flash/Turbo bill 0.5 credits per character, Multilingual v2 and v3
  bill 1.0.

Because audio has its own rate, `costOfTokens` takes an `audio_input` flag and
`recordApiCall` sets it when `feature === 'transcription'`. Without that,
transcription would be under-estimated by 3×.

The dates and sources live in a comment at the top of `lib/pricing.ts` and in the
package README, so the next person knows how stale the table is.

## Deviations from the plan

- **No `characters` field on TTS events.** The plan added one; `text_length`
  already *is* the character count, so adding a second field would have meant two
  names for one number. Reused `text_length`, added only `credits`.
- **Cloning is metered in `cloning/elevenlabs.ts`, not at the form.** The plan
  put a `recordApiCall` at the call site. Doing it inside `cloneVoice` /
  `findSimilarVoices` covers both functions, records failures, and is testable
  against the existing fetch-mocking test file instead of a form component. The
  functions take an optional `userId`.
- **`meterSpeech` returns the original promise.** It attaches its own
  `then`/`catch` and hands back the caller's promise untouched, so the WS→REST
  fallback still sees rejections. This also means both TTS paths share one
  recorder instead of the two divergent ones they had.
- **`transcribeLocally` now returns `{ text, audio_seconds }`.** Needed to record
  what the on-device run would have cost elsewhere; the sample count was already
  in hand, so this was cheaper than decoding the blob twice.
- **`useEventsInRange` extracted.** `useRecentCalls` needed the same live query
  `useAnalyticsSummary` had. Rather than copy it (and its TanStack DB type
  friction) into a second file, both now share one hook.
- **`ProviderSpendChip` instead of a `useProviderSpend` hook.** One component with
  no separate hook — nothing else needs the number.

## Found by running it, not by testing it

Seeded ~150 realistic events into IndexedDB and looked at the real pages. Two
things the unit tests were happy with and a person would not be:

1. **One voice clone dragged all of ElevenLabs off `quota`.** Buckets reported the
   weakest source of their calls, and cloning carried `unknown` — so a provider
   with 60 quota calls and 1 clone rendered as a `$0.00 / No price` row in the
   paid list instead of folding into the credits meter. Unmetered calls now count
   toward `calls` but not toward the bucket's source (`priced_calls` tracks the
   difference).
2. **Unpriced aggregates printed `$0.00`.** `cost_usd` is 0 for a bucket nothing
   priced was ever added to, which reads as "free". `bucketCost()` now drops the
   amount for `quota`/`unknown` so those render as `—`.

Also fixed the recent-calls table: seven columns overflowed the card at 1440px and
clipped the Result column, so latency moved under the timestamp.

## Things worth knowing

- **The cache double-count was real.** `cacheMiddleware` returns the cached
  result *including its original `usage`*, and `use-generate` used to `track()`
  that on every hit. Any pre-existing token total on the dashboard is inflated by
  however many cache hits happened. New events mark hits `cached: true` at $0.
  The meter must stay first in the `middleware` array or hits become invisible
  instead — noted in the AI package README.
- **`wrapStream` is not implemented.** Nothing streams from an LLM today. If a
  path ever does, it goes unmetered silently, which is the failure mode worth
  watching for.
- **Old TTS `duration_seconds` was fiction** — inferred from blob size assuming
  16 kHz 16-bit, while the REST path returns 44.1 kHz MP3. New events record `0`.
  `avg_duration_seconds` in the summary is therefore not meaningful going forward;
  nothing displays it today.
- **Three pre-existing `tsc` errors remain in the usage package** (the TanStack DB
  `and(gte(...))` overload and `collection.insert`). They are baseline — the repo
  has ~60 such errors and `pnpm lint`/`test`/`build` are the actual gates. The
  extraction of `useEventsInRange` kept them from multiplying into a second file.
- **Spend totals exclude quota and unpriced calls by design.** `total_usd` counts
  only `measured` + `estimated`. A bucket mixing sources reports the *weakest*
  one, so a partially-priced row never looks authoritative.

## Not done

- Phase 8 (monthly spend alert) — deferred, needs approval.
- No retention/pruning of analytics events (pre-existing; called out in the plan's
  risks).
- The ElevenLabs credit meter is fetched once per mount of the page or card; there
  is no refresh button.
