# Phase 2 — Personalization: Per-User, Per-Chat, Recency

**Goal.** Make the engine *feel like the user*. Most of the engine's value on day 30 of use is that it predicts what **this specific person** says to **this specific person** — not what the generic corpus says.

**Status.** Planned. Requires Phase 1 (`observe()`, `ngram-model.ts`, `storage.ts`).

## Success metrics (on top of Phase 1 baselines)

| Metric | Phase 1 baseline | Target after Phase 2 |
|---|---|---|
| Top-3 next-word hit rate on **same-chat** context | 55% | ≥ 70% |
| KSR on frequent-contact chats | 0.35 | ≥ 0.50 |
| KSR on first-ever message to a new contact | 0.35 | ≥ 0.35 (no regression) |
| Memory overhead per tracked chat | — | ≤ 400 KB (top-K pruning) |
| Adaptation speed — new repeated phrase reaches top-3 after | never | ≤ 3 occurrences |

## Conceptual model: layered LM with score blending

Mirrors SwiftKey's 2016 "shout the loudest" design ([Engadget 2016](https://engadget.com/2016-09-15-swiftkey-android-neural-network-update.html)) extended to three layers:

```
final_score(word | context) =
      α_base    · S_base(word | context)          // shared corpus (Phase 1)
    + α_user    · S_user(word | context)          // user's aggregate history
    + α_chat    · S_chat(word | context, chatId)  // per-recipient history
    - β_edit    · editCost(word, inputPrefix)     // Phase 1 fuzzy cost
```

Each layer is its own `NgramModel` instance from Phase 1. Layers share the tokenizer and vocabulary key scheme.

**Default blend weights**: `α_base = 1.0`, `α_user = 2.0`, `α_chat = 3.0`.
The personal layers are weighted heavier than the base corpus because they are a stronger signal per observation (user-generated tokens carry intent; corpus tokens carry only language statistics).

These weights are **adaptive**: if a layer has seen fewer than a threshold of tokens (e.g. 500), its weight is scaled down linearly so new chats don't get dominated by 3 observations of "ok".

## Scope

Four concrete changes.

### 2.1 Multi-layer model orchestration

Introduce `LayeredAutocomplete` that composes layered `NgramModel`s:

```ts
class LayeredAutocomplete {
  constructor(opts: {
    base: NgramModel;              // shared corpus, frozen after initial train
    user: NgramModel;              // user's global history
    chats: Map<string, NgramModel>; // per-chat history, lazy-loaded
    blend?: BlendWeights;
  });

  observe(text: string, scope: {
    chatId?: string;
    weight?: number;
  }): void;
  // routes counts into the right layer(s):
  //   - no chatId → user layer only
  //   - with chatId → user layer + chat layer (same text increments both)

  suggestWord(context: string, opts: {
    chatId?: string;
    maxResults?: number;
    fuzzyPrefix?: string;
  }): SuggestionResult[];

  suggestPhrase(context: string, opts: { chatId?: string; length: 2 | 3 | 4 }): string[];
}
```

Rationale for dual-incrementing (user + chat on the same message): a word the user said to contact A is weak evidence they'll say it to contact B — but still evidence. Letting it flow to the global user layer prevents personalization from siloing.

### 2.2 Recency decay

Counts today are strictly additive. A phrase the user said 200 times 18 months ago dominates a phrase they've said 10 times this week — opposite of iOS/Gboard behavior.

Introduce exponential recency weighting on observation:

$$c'(n\text{-gram}) = \sum_i e^{-\alpha \cdot (t_{\text{now}} - t_i)} \cdot w_i$$

Half-life $\alpha = \ln(2) / \tau$ where $\tau$ defaults to 60 days. User-tunable via settings `ai_suggestions.half_life_days`.

Implementation:
- Store counts as `{ count: number; updatedAt: Timestamp }` per n-gram.
- On `observe()`, apply decay to the existing count before incrementing: `count_new = count_old * exp(-α · Δt) + weight`.
- Skip decay if `Δt < 1 hour` (optimization — imperceptible difference, big write savings).
- Nightly compaction (on cold start after > 24h gap): re-decay all counts to current time, then prune entries whose count drops below the n-gram `minNgramCount` threshold.

This approach is stateless in storage (one `updatedAt` per n-gram) and correct: the exponential form composes perfectly across multiple observations at different times.

### 2.3 Per-chat models with top-K pruning

Naïvely every chat gets a full 5-gram model — memory explodes with number of contacts. Two mitigations:

1. **Top-K pruning per order.** Keep at most:
   - 10k unigrams
   - 20k bigrams
   - 30k trigrams
   - 20k 4-grams
   - 10k 5-grams
   On cold start, if a chat model exceeds the budget, drop lowest-count n-grams first. Typical active chat (hundreds of messages) stays far below these caps.

2. **Hot-chat working set.** Load at most the 10 most recently active chats into memory at a time. Other chats are lazy-loaded from IDB on first `suggestWord({ chatId })` call that references them. LRU eviction on exceeding the cap.

Each chat is stored under its own IDB key `autocomplete:chat:<accountId>:<chatId>`.

### 2.4 Hook wiring: `useAutocomplete({ chatId })`

Update `packages/shared/hooks/use-autocomplete.ts`:

```ts
interface UseAutocompleteOptions {
  chatId?: string;               // NEW — enables per-chat layer
  includeMessages?: boolean;     // unchanged
}
```

- On mount: load `base` from IDB (cached via Phase 1), `user` from IDB, and if `chatId` is provided, that chat's model.
- When new messages arrive via `useMessages`, for each message: `autocomplete.observe(message.text, { chatId: message.chatId })`. This routes the same text to both the user layer and the chat layer per §2.1.
- `getCompletions`, `getNextWord`, `getNextPhrase` accept the current `chatId` implicitly (from the hook's bound option), so callers don't need to pass it — keeps the call sites in `use-text.ts` and `use-editor.ts` unchanged.

The existing `chats/[id]/page.tsx` already knows which chat it's in; if it calls `useAutocomplete({ chatId: params.id })`, per-chat personalization lights up automatically.

## File-by-file plan

```
packages/shared/lib/autocomplete/
├── autocomplete.ts                MODIFIED — delegate to LayeredAutocomplete
├── layered-autocomplete.ts        NEW — multi-layer orchestrator
├── ngram-model.ts                 MODIFIED — add decay on observe, prune by top-K
├── recency.ts                     NEW — decay math + compaction helpers
├── storage.ts                     MODIFIED — LRU loader for chat models
├── types.ts                       MODIFIED — add BlendWeights, LayerScope, ChatModelKey
└── plans/
```

`hooks/use-autocomplete.ts` — **modified** to accept `chatId`, wire the chat layer, and route observations through the scoped `observe`.

## TDD test list

Tests in `__tests__/phase-2/`.

**Layer blending (`layered.test.ts`)**
1. With base only (empty user/chat): blended score equals base score (times weight)
2. User layer contains "Tuesday" never in base: `suggestWord("on")` surfaces "Tuesday" once user layer has ≥ 3 observations
3. Chat layer overrides user layer: user has "meeting", chat has "game night" — `suggestWord("see you at the")` with chatId prefers "game night"
4. Empty chat layer with `chatId` that has no history: blended result equals (base + user) blend; no NaN / divide-by-zero

**Adaptive weights (`adaptive-weights.test.ts`)**
5. Chat with 0 observations contributes 0 effective weight
6. Chat with 250 observations (below threshold 500) contributes proportional weight
7. Chat with 1000 observations uses full configured weight

**Recency decay (`recency.test.ts`)**
8. `observe("hi")` at t=0, then at t=60 days → count is `1 * exp(-ln2) + 1 = 1.5`, not 2
9. Skip-decay window: two observes within 1 hour yield count 2 exactly (no decay applied)
10. Nightly compaction drops entries below threshold after sufficient idle time
11. Setting `halfLifeDays = Infinity` disables decay (back-compat with Phase 1 behavior)

**Per-chat models (`per-chat.test.ts`)**
12. Observing with `chatId: "A"` increments user layer AND chat A layer; chat B layer unchanged
13. Chat top-K pruning kicks in: after observing 50k unique trigrams, only 30k remain (lowest-count dropped first)
14. LRU eviction: after loading 11 chats with max 10 hot, oldest-touched chat is serialized and unloaded

**Hook integration (`hook.test.ts`)**
15. `useAutocomplete({ chatId: "A" })` initializes chat A's layer on mount
16. Switching `chatId` from "A" to "B" does not lose A's layer (stays in LRU cache)
17. `getNextWord` returns chat-specific predictions when `chatId` is active

**Evaluation harness (`eval.test.ts`)**
18. Simulated eval: feed 20 messages to chat A, 20 to chat B, predict the 21st to each. Chat-A predictions use A-specific vocabulary, B-specific predictions use B vocab. KSR in both chats ≥ 0.50.

**Back-compat (`backcompat.test.ts`)**
19. All Phase 1 tests still pass with layered engine as default
20. `useAutocomplete({})` without `chatId` behaves identically to Phase 1 (base + user layers only)

## Edge cases

- **Account switch on same device**: user layer is keyed by `accountId`. On account change, swap user layer; keep base in place.
- **Message from contact vs. from user**: only the user's **own** sent messages feed the LM. Received messages are NOT observed — the engine predicts what the user will type, not what they receive. Filter in the hook by `message.authorId === account.id`.
- **Very short chats** (1–2 messages): chat layer contributes almost nothing due to adaptive weight; no regression vs. Phase 1.
- **Timestamp drift**: decay depends on `Date.now()`. If device clock jumps forward, counts decay too fast once. Cap Δt per step at 90 days to bound damage; log anomaly.
- **Concurrency**: only one React tree touches the engine at a time; but serialize IDB writes via `storage.ts` queue to avoid torn writes.

## Performance budget

- Per-layer score lookup: O(1) hashmap — ≤ 1 ms per layer; blended result ≤ 3 ms for 3 layers + top-K merge
- Chat-layer cold load from IDB: ≤ 15 ms per chat
- Memory per loaded chat (after top-K): ≤ 400 KB
- Total memory with 10 hot chats + user + base: ≤ 15 MB

## Rollout

1. Ship `LayeredAutocomplete` behind the same `v2_enabled` flag (Phase 1 rolls out together; Phase 2 is a follow-up PR inside the flag).
2. Internal dogfood for 1 week; watch memory usage on web DevTools.
3. Flip flag default on.
4. Phase 2 metrics (per-chat KSR) appear in `/stats` dev page for ongoing tracking.

## Risks & mitigations

- **Personalization over-fits to a single contact**, drowning the base corpus. Mitigation: adaptive-weight cap on chat layer (max 3.0), and evaluation test #4 ensures no NaN/infinite dominance.
- **Recency decay hides useful rare phrases** that the user says once a month. Mitigation: long default half-life (60 days) — tune based on eval data.
- **Storage growth** from per-chat models with many contacts. Mitigation: top-K pruning + LRU caps + nightly compaction + a hard per-account cap on total IDB bytes (e.g. 50 MB) that triggers pruning of the oldest chats.
- **Privacy surface increases** — per-chat models are detailed records of how the user talks to each person. Mitigation: all storage is on-device, no sync, never logged. Exposed to user via a "Clear learned phrases for this chat" action (future UX work).

## Out of scope for Phase 2

- Cross-device sync of personal LM (future work; requires CRDT or server-side LM)
- Sentence completion (Phase 3)
- Role-aware models (work vs. family contacts) — possible future extension on top of chat-level
