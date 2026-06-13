# Phase 3 — Neural Sentence Completion (Smart Compose)

**Goal.** Real sentence completion. Not "next word" — multi-clause continuations the user accepts with one tap. The single largest keystroke-savings lever for eye-gaze / switch users.

**Status.** Planned. Requires Phase 1 (tokenizer, n-gram engine) and Phase 2 (layered personalization). Phase 3 adds neural scoring *on top* of the layered engine; n-grams remain the offline fallback.

## Success metrics

| Metric | After Phase 2 | Target after Phase 3 |
|---|---|---|
| Sentence-completion acceptance rate (user taps "accept" ≥ 1 token of ghost text) | — | ≥ 35% of prompts |
| KSR on messages where sentence completion was offered | 0.50 | ≥ 0.70 |
| p50 latency for a 12-token completion | — | ≤ 500 ms on mid-tier laptop (M1 / Ryzen 5) |
| p95 latency for a 12-token completion | — | ≤ 1200 ms |
| Cache hit rate on repeated contexts during a writing session | — | ≥ 40% |
| Works without WebGPU (WASM fallback) | — | Yes — at reduced quality / higher latency (≤ 3 s) |
| No regression when neural layer is disabled/unavailable | — | Engine degrades cleanly to Phase 2 |

## Design philosophy

Neural completion is **additive and optional**. Every failure mode (no WebGPU, model download aborted, inference timeout, user toggle off) must fall back to Phase 2's layered n-gram engine. Users on low-end devices get the keyboard-class n-gram experience; users on capable devices get Smart Compose.

This matches how Gboard actually ships: the [Neural Search Space paper (2024)](https://arxiv.org/pdf/2410.15575) keeps the n-gram FST as a parallel path and overlays the NN-LM at runtime.

## Architecture

```
user typing context (last ~64 tokens)
                │
                ▼
        ┌───────────────┐
        │  Orchestrator │ ─────────────────────────────┐
        └───────┬───────┘                              │
                │                                       │
      ┌─────────┴─────────┐                             │
      ▼                   ▼                             │
┌──────────┐        ┌──────────────┐                    │
│ Phase 2  │        │ NeuralEngine │  (async, lazy)     │
│ Layered  │        │  adapter API │                    │
│  NGram   │        └──────┬───────┘                    │
│  (word)  │               │                            │
└────┬─────┘        ┌──────┴───────┐                    │
     │              ▼              ▼                    │
     │        ┌─────────┐    ┌──────────┐               │
     │        │ WebLLM  │    │ CoreML   │ (Swift app)   │
     │        │ adapter │    │ adapter  │               │
     │        └─────────┘    └──────────┘               │
     │                                                   │
     ▼                                                   ▼
word suggestions (< 8 ms)           sentence suggestions (300–800 ms)
```

The **Phase 2 engine** keeps handling per-keystroke word suggestions (fast path). The **neural engine** handles *sentence* completion triggered by different UX events (pause, space-hold, explicit "complete" button) — a slower path that doesn't block typing.

## Scope

Five concrete pieces.

### 3.1 `NeuralEngine` interface and adapter pattern

A thin platform-agnostic interface so Web and Swift can share the decoding and caching logic:

```ts
interface NeuralEngine {
  readonly state: 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';
  readonly info: { modelId: string; sizeBytes: number; vocabSize: number };

  // Fires when state changes; lets the UI show download progress
  subscribe(listener: (state: NeuralEngineState) => void): () => void;

  // Complete up to `maxNewTokens` tokens from `context`.
  // Returns a ReadableStream of tokens for incremental UI update.
  completeStream(context: string, opts: {
    maxNewTokens?: number;     // default 12
    beamWidth?: number;        // default 1 (greedy) — beam search behind flag
    temperature?: number;      // default 0.2 (near-greedy for predictability)
    stopSequences?: string[];  // default [".", "!", "?", "\n"]
    signal?: AbortSignal;      // cancel on next keystroke
  }): Promise<ReadableStream<string>>;
}
```

Two adapters:

- `WebLLMAdapter` — uses `@mlc-ai/web-llm`; WebGPU with WebAssembly fallback.
- `TransformersJsAdapter` — uses `@huggingface/transformers`; alternative runtime, may be better for WASM-only environments. Pick whichever benchmarks better on target hardware; keep the other as a documented option.

Both adapters implement the same interface; the orchestrator is adapter-agnostic.

### 3.2 Model selection

Pick one default; expose `ai_suggestions.model` as a setting for experimentation.

| Model | Quant | Download | VRAM | Quality for predictive text |
|---|---|---|---|---|
| **SmolLM2-360M-Instruct** (MLC) | q4f16 | ~220 MB | ~280 MB | Good for continuations; fast |
| **Qwen2.5-0.5B-Instruct** (MLC) | q4f32_1 | ~320 MB | ~800 MB | [Strong baseline](https://huggingface.co/rubenz-org/qwen2-5-0-5b-instruct-mlc) |
| Llama-3.2-1B-Instruct | q4f32 | ~700 MB | ~800 MB | Higher quality, larger |

**Default: Qwen2.5-0.5B.** Best quality-per-byte for chat-style continuations. SmolLM2-360M is the explicit low-bandwidth alternative the user can switch to.

Reference for size baselines: Apple's on-device predictive text model is [34M params](https://jackcook.com/2023/09/08/predictive-text.html); SwiftKey's production transformer is [6 MB quantized, 4-layer](https://arxiv.org/html/2505.05648v1). Both are *smaller* than our minimum option — our models are not the constraint, the browser runtime overhead is.

### 3.3 UX triggers (not every keystroke)

Running the LLM per keystroke is wrong — burns battery, duplicates the n-gram engine's job, and hides completions behind network of UI updates. Three trigger modes to pick from (start with the first; add others behind settings):

1. **Idle trigger** — 400 ms since last keystroke AND current sentence has ≥ 2 words AND doesn't end with sentence-final punctuation → request sentence completion. Show as inline ghost text (Gmail Smart Compose style).
2. **Accept trigger** — user accepts a word suggestion that ends with a space → immediately request the next clause.
3. **Explicit trigger** — a dedicated "complete" action in the toolbar or keyboard; highest intent signal, lowest latency cost (user already committed to waiting).

Cancellation: any new keystroke aborts the in-flight completion (`AbortSignal`). Prevents wasted compute and stale ghost text.

### 3.4 Caching and debouncing

Context-keyed cache dramatically cuts perceived latency during a writing session:

```ts
interface CompletionCache {
  get(contextHash: string): string | undefined;
  set(contextHash: string, completion: string, ttlMs?: number): void;
}
```

- Key: SHA-256 of the last 6 tokens (or `<s>` for sentence start) + model id + temperature.
- Value: full completion string.
- Size: LRU of 500 entries; ~200 KB.
- Hit rate target ≥ 40% in real use — driven by the fact that ALS users compose short messages and often start with similar openings ("hey", "could you", "i need").

Debounce: 400 ms (same as idle trigger). If the user resumes typing, the debounced request never fires.

### 3.5 Blended re-ranking of word suggestions (optional, feature-flagged)

Once the neural engine is loaded, it can also *improve word-level suggestions* by re-scoring the top-K candidates from Phase 2:

```
final_word_score = α_ngram · S_ngram + α_neural · S_neural
```

`α_neural` starts at 0 (disabled) and is exposed behind a setting. This is the same pattern Gboard uses per [the NSS paper](https://arxiv.org/pdf/2410.15575) — n-grams nominate candidates cheaply, NN re-ranks.

Only enable if p50 latency for re-ranking stays under 30 ms (i.e. only on WebGPU-capable devices with the model already warm). Keep it off by default until metrics justify it.

## Public API changes

Additive. Existing methods unchanged.

```ts
class Autocomplete {
  // ...Phase 1+2 methods unchanged...

  // NEW — sentence completion
  suggestSentence(context: string, opts?: {
    chatId?: string;
    maxNewTokens?: number;
    numCandidates?: number;  // beam search width; 1 = greedy
    signal?: AbortSignal;
  }): Promise<AsyncIterable<{ text: string; score: number }>>;

  // NEW — neural engine state (for UI: show download progress, feature availability)
  getNeuralEngineState(): NeuralEngineState;
  onNeuralEngineStateChange(cb: (s: NeuralEngineState) => void): () => void;
}
```

For React consumers, a new hook:

```ts
// packages/shared/hooks/use-smart-compose.ts
function useSmartCompose(opts: {
  chatId?: string;
  enabled?: boolean;          // user preference gate
  trigger?: 'idle' | 'accept' | 'explicit';
}): {
  ghostText: string | null;
  accept: () => void;
  reject: () => void;
  state: NeuralEngineState;
  progress: number | null;    // 0..1 during download
};
```

## File-by-file plan

```
packages/shared/lib/autocomplete/
├── autocomplete.ts                MODIFIED — wire suggestSentence + neural re-rank
├── neural/
│   ├── index.ts                   NEW — NeuralEngine interface, factory
│   ├── webllm-adapter.ts          NEW — @mlc-ai/web-llm integration
│   ├── transformers-adapter.ts    NEW — @huggingface/transformers integration (optional)
│   ├── cache.ts                   NEW — LRU completion cache
│   └── stop.ts                    NEW — stop-sequence detection for streaming
├── plans/
```

```
packages/shared/hooks/
├── use-autocomplete.ts            MODIFIED — expose neural engine state
└── use-smart-compose.ts           NEW — ghost-text UX hook
```

Apps wiring (non-blocking; Phase 3 core can ship with no app changes):
- `apps/web/app/(app)/chats/[id]/page.tsx` — opt in to `useSmartCompose` behind a user setting.
- `apps/swift/` — Swift adapter added later against the same `NeuralEngine` spec (likely a `CoreMLAdapter`).

## New dependencies

- `@mlc-ai/web-llm` — primary adapter. Add to `packages/shared/package.json`.
- `@huggingface/transformers` — optional; only add if we ship the adapter.

Both are browser-only; tree-shake cleanly from SSR via dynamic `await import()` guarded by `typeof window !== 'undefined'`.

## TDD test list

Tests in `__tests__/phase-3/`. Neural inference tests use a **mock adapter** that returns scripted completions — no actual model download in CI.

**NeuralEngine interface contract (`neural-engine-contract.test.ts`)**
1. `state` transitions: `idle → loading → ready` (or `error`)
2. `subscribe` fires on every transition; returns an unsubscribe function
3. `completeStream` respects `AbortSignal`: aborted stream emits no more tokens and settles
4. `completeStream` respects `stopSequences`: generation halts on first stop token
5. `info` populated only after `state === 'ready'`

**Cache (`cache.test.ts`)**
6. Get after set returns the same completion
7. LRU eviction: 501st entry evicts the least-recently-used
8. TTL expiry: entries past TTL return undefined
9. Cache key depends on model id — switching models invalidates cache

**Orchestrator (`orchestrator.test.ts`)**
10. `suggestSentence` streams from the mock adapter; yields incremental tokens
11. `suggestSentence` caches a successful completion; second call with same context returns cached value without calling adapter
12. `suggestSentence` falls through to Phase 2 `suggestPhrase(length=4)` if adapter `state === 'error'` or `'unsupported'`
13. Concurrent calls with the same context deduplicate (single in-flight request, multiple subscribers)

**Stop sequence detection (`stop.test.ts`)**
14. Stops at `. ` boundary inside a streaming token ("hello.<STOP>")
15. Does not stop on `.` inside a decimal ("3.14")
16. Multiple stop sequences — first match wins

**Hook (`use-smart-compose.test.ts`)**
17. `enabled: false` never calls the neural engine
18. Idle trigger: after 400 ms idle with ≥ 2 words in context, ghostText populates
19. New keystroke within 400 ms cancels the request (AbortSignal fires)
20. `accept()` inserts ghost text; `reject()` clears it

**Fallback (`fallback.test.ts`)**
21. WebLLM unavailable (simulate by removing `window.navigator.gpu` and no WebLLM import): engine state becomes `'unsupported'`; `suggestSentence` returns Phase 2 phrase suggestions instead
22. Download failure (mock adapter throws): state → `'error'`; exposed via `getNeuralEngineState()`; n-gram engine keeps working

**Integration evaluation (`neural-eval.test.ts`)**
23. On a held-out message set, with mock adapter producing deterministic scripted completions, KSR on "completion-accepted" messages exceeds 0.65 (synthetic bar — real number depends on live model).

No test in CI loads a real LLM (too slow / too large). A separate opt-in script (`scripts/eval-neural.ts`) runs the real model end-to-end locally for before/PR metrics.

## Edge cases

- **First-time model download** (hundreds of MB) must be user-consented. Hook exposes `progress`; UI shows explicit "Download Smart Compose model (~320 MB)" with a button. No surprise downloads.
- **Download interrupted / cache cleared**: model redownloads on next request; n-gram engine handles predictions during the gap.
- **Mobile / low-memory devices**: feature flag gates by `navigator.deviceMemory` if available; default off on < 4 GB devices.
- **Private/incognito mode**: IDB may be ephemeral; model re-downloads per session. Acceptable; explicit UX toast.
- **Streaming interruption mid-word**: adapter must emit complete graphemes, not sub-characters. WebLLM handles this; verify in integration test.
- **Language switch**: we default to an English-focused model. Non-English contexts should disable neural layer (detected by majority-script heuristic or user locale). Phase 2 n-grams keep working.
- **Accessibility**: ghost text must be readable by screen readers as a suggestion, not as committed text. ARIA live region + role="status".

## Performance budget

- Idle CPU while neural engine is warm: ≤ 1% (no inference without a trigger)
- Completion generation on M1/M2: ≤ 500 ms p50 for 12 tokens (WebLLM benchmarks: ~40–70 tok/s for sub-1B models; [WebLLM paper Table 1](https://arxiv.org/html/2412.15803v2))
- Completion generation on WASM fallback: ≤ 3 s (significantly worse; UI should show a spinner)
- Memory overhead with neural engine loaded: 800 MB VRAM (WebGPU) or 400 MB RAM (WASM) on top of Phase 1+2 baseline
- First-token latency: ≤ 150 ms (matters for "responsive" perception — user sees ghost text start filling in)

## Rollout

1. **Alpha (internal-only flag)**: ship the full neural engine plus a dev-only page `/dev/smart-compose` for evaluation. Real users do not see it.
2. **Beta (opt-in setting)**: add `ai_suggestions.smart_compose_enabled` to the account settings form in `packages/speech/components/speech-settings-form.tsx` (and parallel Swift settings). Gated by "experimental features" category. Instrumented for acceptance rate and latency.
3. **Default on** for WebGPU-capable devices after two weeks of green metrics. Setting remains, now default-on instead of default-off.
4. **Swift parallel track**: once the TS interface is stable, implement `CoreMLAdapter` in Swift against the same `NeuralEngine` spec. Can share evaluation harness.

## Risks & mitigations

- **Model download UX**: many MB on a slow connection is a bad first run. Mitigation: explicit consent, progress UI, "remind me later" option, download resumes across sessions via IDB storage.
- **Bad completions embarrass the user**: LLMs occasionally hallucinate names, facts, or inappropriate content in sensitive communications (this is a disability/medical context). Mitigation: low temperature (0.2 default), short completions (12 tokens), ghost-text UX requires explicit accept — user never sends something they didn't see. Content filter on stop sequences (profanity list configurable per account).
- **Privacy concern about sending context anywhere**: inference is entirely in-browser/on-device. Zero network calls after model download. Cover explicitly in privacy docs for the setting.
- **Battery / thermal on laptops**: inference only runs on triggers, not per keystroke. In-flight requests cancel on new keystrokes. Budget caps (see §Performance) enforced via `AbortController` timeout.
- **WebLLM API surface drift**: this library is pre-1.0. Mitigation: adapter pattern isolates it; adapter test harness catches breaking changes on upgrade.
- **Swift adapter never lands**: Phase 3 still shipped value on web; Swift remains Phase 2 until resourced. No blocker to shipping web-only first.

## Out of scope for Phase 3

- Fine-tuning the model on the user's corpus (requires offline LoRA training pipeline; valuable future work — potentially Phase 4)
- Server-side completion fallback (privacy trade-off; would need explicit opt-in and auth)
- Multi-turn dialogue understanding (this is single-message completion, not conversation continuation)
- Voice input / ASR (separate product surface)

## Phase 4 teaser

Once Phases 1–3 ship, the obvious next step is **user-adapted LoRA**: fine-tune the base neural model on the user's sent messages offline, ship the adapter (~2 MB per user), blend at inference. Matches SwiftKey's 2025 DP approach at a smaller scale. Not planned yet; recorded here so the adapter pattern in §3.1 can accommodate it (adapter `info.adapters: LoRAAdapter[]` field).
