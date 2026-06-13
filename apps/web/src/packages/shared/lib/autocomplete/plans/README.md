# Autocomplete Upgrade Plans

This directory plans the evolution of `@/packages/shared/lib/autocomplete` from a pure trie + bigram/trigram engine into a keyboard-class predictive engine with personalization and neural sentence completion.

> **Product frame.** September is an assistive communication app for people with ALS, MND, and speech/motor difficulties. Every saved keystroke is real quality of life. Optimize for **keystroke savings per session**, not raw latency. A 300 ms pause that produces a 12-word completion is a win, not a regression.

## Why upgrade

Current engine (`autocomplete.ts`, 477 LOC) is a solid v1 but has five structural gaps vs. iOS QuickType, Gboard, and SwiftKey:

1. No smoothing → unseen trigrams bias predictions toward bigram noise
2. No fuzzy/typo tolerance → single mistype breaks prediction
3. No personalization layer → user-specific phrases compete on equal footing with generic corpus
4. No sentence completion → stuck at single-word prediction
5. Full retrain on every `messages` change → cold-start cost grows with history

Reference architectures that shipped these features in production:

- [Ouyang 2017 — Mobile Keyboard Input Decoding with FSTs](https://arxiv.org/abs/1704.03987) (Gboard decoder)
- [Hard 2018 — Federated Learning for Mobile Keyboard Prediction](https://arxiv.org/pdf/1811.03604) (Gboard neural NWP, 6.4M params)
- [Cook 2023 — iOS predictive text teardown](https://jackcook.com/2023/09/08/predictive-text.html) (34M-param GPT-2 style)
- [SwiftKey DP transformer 2025](https://arxiv.org/html/2505.05648v1) (6 MB quantized transformer)
- [WebLLM 2024](https://arxiv.org/html/2412.15803v2) (browser LLM inference)

## Phases

Each phase is independently shippable. Stop at any phase if quality/keystroke-savings targets are hit.

| Phase | Scope | Size | Risk | Ship value | Status |
|---|---|---|---|---|---|
| [1 — Smoothing + fuzzy + persistence](./phase-1-ngram-smoothing.md) | Stupid Backoff 5-grams, Levenshtein automaton w/ QWERTY weighting, incremental `observe()`, IndexedDB persistence, punctuation/emoji tokenizer | ~1 week | Low (pure TS, no deps) | +30–50% keystroke savings on held-out messages | **Shipped** |
| [2 — Personalization layers](./phase-2-personalization.md) | Layered `base`/`user`/`chat` `NgramModel`s with blended scoring, adaptive chat weight, recency decay (60-day default half-life), top-K pruning, v2 engine snapshot | ~3–5 days | Low | +15–25% additional savings on active chats | **Shipped** |
| [3 — Neural sentence completion](./phase-3-neural-sentence-completion.md) | WebLLM + Qwen2.5-0.5B (or SmolLM2-360M) for Smart Compose; beam search; cache; WASM fallback for no-WebGPU | ~1–2 weeks | Medium (model download UX, device compat) | Ship-level Smart Compose; largest single win for ALS users | Planned |

### v2 (Phase 2) — what's new

- **`LayeredAutocomplete`** (`layered-autocomplete.ts`) composes three `NgramModel`s and blends scores:
  `final_score = α_base·S_base + α_user·S_user + α_chat_eff·S_chat` (defaults 1 / 2 / 3).
  `α_chat` is adaptive: scaled linearly from 0 up to the configured value over the first 500 chat tokens, so a brand-new chat with 3 "ok"s doesn't drown out the shared corpus.
- **Recency decay** (`recency.ts`, new `NgramModel.halfLifeMs`). Counts halve every 60 days by default; configurable via `AutocompleteOptions.halfLifeMs` / `halfLifeFromDays()`. `Infinity` disables decay entirely (back-compat). Observations within a 1-hour skip window apply no decay (keeps same-session counts integer).
- **Top-K pruning** (`NgramModel.prune({ 1, 2, 3, 4, 5 })`). Drops lowest-count n-grams per order to cap per-chat memory; base layer is never pruned.
- **`NgramModel.compact(nowMs?)`** re-decays every entry to the same reference time and recomputes `contextTotals` in O(|n-grams|) — call on cold start to catch up on idle-time decay.
- **v2 snapshot format** (`persistence.ts`): `{ base, user, chats: Record<chatId, …> }`. Reader still accepts v1 (Phase 1) snapshots by loading the single ngram into `base`.
- **`Autocomplete.observe(text, { chatId })`**, **`getNextWord(ctx, { chatId })`**, **`suggestWord({ …, chatId })`** — all context methods thread the chatId through. Without it the engine uses `base + user` only (identical to Phase 1 behaviour after observations accumulate).
- **Hook integration** (`packages/shared/hooks/use-autocomplete.ts`): accepts `{ chatId }`, routes `useMessages()` deltas through `observe(text, { chatId: message.chat_id })`, and filters to `message.type === 'user'` so only the user's own sent messages feed the LM. The chat-scoped editor in `apps/web/app/(app)/chats/[id]/layout.tsx` wires the URL chatId through `EditorProvider` → editor `<Autocomplete>` automatically.

## Cross-cutting constraints

### TDD (per root `CLAUDE.md`)

Every phase **lists tests first**. Red → green → refactor. No production code lands without a failing test first.

### Backwards compatibility

The public API consumed by these three hooks stays intact:

- `packages/shared/hooks/use-autocomplete.ts`
- `packages/shared/hooks/use-text.ts`
- `packages/editor/hooks/use-editor.ts`

Concretely: `train()`, `getCompletions()`, `getNextWord()`, `getNextPhrase()`, `isReady()`, `getStats()` keep their current signatures. New capabilities go behind new methods (`observe`, `suggestSentence`, `suggestWord`).

### Cross-platform

The Swift app (`apps/swift/`) also uses typing assistance. The plans favor **engine logic in portable TypeScript** with small, well-defined interfaces so the Swift app can either:
(a) reimplement the pure engine against a shared spec, or
(b) embed a JS core via `JavaScriptCore` if that's preferable.

Phase 3's neural model is intentionally split: the **decoder/blender** is portable TS; the **runtime** (WebLLM in the browser vs. CoreML on macOS) is a platform adapter behind an interface.

### Privacy

All personal data (user corpus, per-chat counts, personal LM) stays **on device**. IndexedDB for web, SwiftData for macOS. No telemetry of user text is added by these plans.

### Performance budget per phase

| Phase | Cold start | p50 word suggestion | p50 sentence completion |
|---|---|---|---|
| Today | ~200 ms (parse 2 MB corpus) | < 5 ms | N/A |
| After Phase 1 | < 30 ms (load serialized model) | < 5 ms | N/A |
| After Phase 2 | < 30 ms | < 8 ms (blend 3 models) | N/A |
| After Phase 3 | < 30 ms + lazy 200–800 MB model download | < 8 ms | 300–800 ms (cached: < 20 ms) |

## Success metrics (global)

Tracked via the existing `autocomplete.getStats()` plus new instrumentation:

1. **KSR — Keystroke Savings Rate** on held-out user messages:
   $\text{KSR} = 1 - \dfrac{\text{keystrokes needed with engine}}{\text{keystrokes to type message from scratch}}$
   Baseline target ≥ 0.35 after Phase 1; ≥ 0.55 after Phase 3.
2. **Top-3 next-word hit rate** on held-out messages: target ≥ 55% after Phase 1.
3. **Cold-start time** from `useAutocomplete` mount to `isReady === true`: ≤ 50 ms after Phase 1.
4. **No regressions** in existing `test.ts` suite.

Each phase plan restates its own metric targets.
