# Phase 1 — Smoothed N-grams, Fuzzy Lookup, Persistence

**Goal.** Lift the engine from "plausible demo" to "production quality n-gram engine comparable to Gboard's static LM circa 2017." Pure TypeScript, no new runtime dependencies.

**Status.** Planned. Depends on nothing. Unblocks Phases 2 and 3.

## Success metrics

| Metric | Baseline (today) | Target after Phase 1 |
|---|---|---|
| Top-3 next-word hit rate on held-out user messages | ~30% (estimated) | ≥ 55% |
| Keystroke Savings Rate (KSR) | ~0.15–0.20 | ≥ 0.35 |
| Handle 1-edit typos in prefix | 0% | ≥ 85% |
| Cold start (`useAutocomplete` mount → ready) | ~200 ms | ≤ 50 ms |
| Memory of trained engine | ~8 MB for 2 MB corpus | ≤ 6 MB |
| Existing `test.ts` suite | green | green (no regression) |

## Scope

Five concrete changes, each independently testable.

### 1.1 Extend n-gram model to 5-grams with Stupid Backoff

N-grams up to order 5 (matching Gboard's static LM, [Hard 2018](https://arxiv.org/pdf/1811.03604)). Scoring uses **Stupid Backoff** from [Brants et al. 2007](https://web.stanford.edu/~jurafsky/slp3/3.pdf), λ = 0.4:

$$
S(w_i \mid w_{i-N+1}^{i-1}) = \begin{cases}
\dfrac{c(w_{i-N+1}^{i})}{c(w_{i-N+1}^{i-1})} & \text{if } c(w_{i-N+1}^{i}) > 0 \\
0.4 \cdot S(w_i \mid w_{i-N+2}^{i-1}) & \text{otherwise}
\end{cases}
$$

Terminates at unigram: $S(w) = c(w) / N_{\text{total}}$.

**Why Stupid Backoff over Kneser-Ney?** At our corpus size (single-user messages + shared corpus), SB is ~10 lines, matches KN within ~1% perplexity per Brants, and composes cleanly with Phase 2's personal LM layer. KN can replace SB later behind the same interface if evaluation warrants it.

**Memory control.** Count-pruning: drop any n-gram of order ≥ 3 seen fewer than 2 times. Expected memory reduction ~60% vs. naive counts. Configurable via `{ minNgramCount: 2 }`.

### 1.2 Tokenizer that preserves punctuation, casing, and emoji

Today's tokenizer strips `[^\w\s]` which loses `,`, `.`, `?`, `!`, `'`, and emoji — all predictable tokens.

New tokenizer:

- Splits on Unicode word boundaries using `Intl.Segmenter` with `granularity: 'word'` (widely supported, replaces the regex).
- Treats punctuation and emoji as first-class tokens (each emoji cluster via `Intl.Segmenter` `granularity: 'grapheme'`).
- Normalizes casing in a **recoverable** way: lowercase is the key used in n-grams; the original surface form is stored per vocabulary entry so suggestions match the user's typing style (sentence-initial capitalization, etc.).
- Emits sentence-boundary sentinels `<s>` and `</s>` so n-grams learn sentence starts (fixes "empty context → unigram noise" today).

### 1.3 Levenshtein-automaton fuzzy completion with QWERTY weighting

Replace exact-match trie prefix walk with a fuzzy walker. Construct a [Levenshtein automaton](https://en.wikipedia.org/wiki/Levenshtein_automaton) for the current input (O(|input|) time, O(|input|) space) and traverse it synchronously with the existing trie. Return words within edit distance `k`, scored by edit cost.

**Edit costs are QWERTY-weighted**, following the pattern in [clavier](https://github.com/MaxHalford/clavier) and [qwerty-weighted-levenshtein](https://pypi.org/project/qwerty-weighted-levenshtein/):

- Adjacent-key substitution (e.g. `r ↔ t`, `a ↔ s`): cost 0.3
- Same-row-non-adjacent substitution: cost 0.7
- Any other substitution: cost 1.0
- Insertion/deletion: cost 1.0

Final ranking blends LM score with edit cost:

$$
\text{score}(w) = \log S_{\text{LM}}(w \mid \text{context}) - \beta \cdot \text{editCost}(w, \text{input})
$$

`β` is configurable; default 1.5 so LM dominates for words already in context. Without a context (bare prefix), β drops to 0.5 so typo correction dominates.

`k` (max edits) grows with input length: 0 for 1–2 chars, 1 for 3–4 chars, 2 for 5+ chars. Avoids suggesting garbage for very short prefixes.

### 1.4 Incremental `observe(text)` — no full retrain

Today `useAutocomplete` calls `new Autocomplete()` + `train(...)` whenever `account`, `messages`, or `includeMessages` changes. For a user with months of messages this is increasingly expensive.

New API:

```ts
autocomplete.observe(text: string, opts?: { weight?: number }): void
```

Semantics:

- Tokenizes `text`, walks n-grams of order 1..5, increments counts.
- **Does not retrain existing counts**; purely additive.
- `weight` multiplier defaults to 1; used by Phase 2 to fold recency decay in.
- `isReady()` flips to true after the first `observe()` or `train()` call.

The hook change (`use-autocomplete.ts`): on first mount, `train(baseCorpus)` once. On subsequent `messages` updates, only `observe(newMessageText)` for deltas.

### 1.5 Serialized model persistence via IndexedDB

Cold start today re-tokenizes ~2 MB of corpus on every page load. Persist the trained model and load instead of rebuild.

- Format: a compact binary layout (sorted vocabulary id tables + n-gram count arrays). JSON is acceptable for Phase 1 if it's behind an interface; binary can replace it later.
- Key: `autocomplete:base:<corpusHash>` for the shared corpus; `autocomplete:user:<accountId>` for the user's accumulated counts. (Phase 2 adds per-chat keys.)
- On mount:
  1. Hash base corpus (SHA-256 of text) → look up cached model.
  2. If miss, train from corpus, serialize, store.
  3. Load user layer from IDB if present.
  4. Append any unseen messages via `observe()`.
- Write-through: `observe()` schedules a debounced 2-second write to IDB (single pending write; coalesced).

## Public API changes

All additions; no removals. All existing calls keep working.

```ts
class Autocomplete {
  train(corpus: string): void;              // unchanged
  observe(text: string, opts?: { weight?: number }): void;   // NEW
  getCompletions(input: string): string[];  // unchanged
  getNextWord(sequence: string): string[];  // unchanged
  getNextPhrase(sequence: string): string[]; // unchanged

  // NEW — advanced access for Phase 2+3
  suggestWord(context: string, opts?: SuggestWordOptions): SuggestionResult[];

  // NEW — serialization
  serialize(): Uint8Array;
  static deserialize(bytes: Uint8Array): Autocomplete;
}

interface SuggestWordOptions {
  maxResults?: number;        // default 5
  fuzzyPrefix?: string;       // run fuzzy lookup if set
  maxEditDistance?: number;   // auto from prefix length if unset
  minScore?: number;
}
```

## File-by-file plan

```
packages/shared/lib/autocomplete/
├── autocomplete.ts                MODIFIED — orchestrator; keep back-compat surface
├── trie-node.ts                   MODIFIED — add fuzzy traversal helper
├── types.ts                       MODIFIED — add NgramModel, SerializedModel, SuggestWordOptions
├── utils.ts                       MODIFIED — keep for API compat; new tokenizer below
├── ngram-model.ts                 NEW — counts storage + Stupid Backoff scoring, up to order 5
├── ngram-model.test.ts            NEW
├── tokenizer.ts                   NEW — Intl.Segmenter based, punctuation/emoji/sentence-boundary aware
├── tokenizer.test.ts              NEW
├── levenshtein-automaton.ts       NEW — automaton construction + synchronized trie traversal
├── levenshtein-automaton.test.ts  NEW
├── keyboard-layout.ts             NEW — QWERTY proximity table + weighted cost function
├── keyboard-layout.test.ts        NEW
├── serialization.ts               NEW — serialize/deserialize engine state
├── serialization.test.ts          NEW
├── persistence.ts                 NEW — thin wrapper over @september/shared/indexeddb
├── persistence.test.ts            NEW
└── plans/                         (this folder)
```

> **Test layout note.** Tests are colocated next to source (`foo.test.ts` next to `foo.ts`), matching the existing convention used by `lib/indexeddb/kv-store.test.ts` and `lib/slides/slides.test.ts`. Run with `pnpm test` (vitest + jsdom globally configured).
>
> **IDB note.** Reuse the existing `KVStore` helper at `@september/shared/indexeddb` rather than a new IDB wrapper. `persistence.ts` is a small typed facade over it.

`hooks/use-autocomplete.ts` — **modified** to call `observe()` for deltas instead of full retrain; loads persisted state via `storage.ts`.

`hooks/use-text.ts`, `packages/editor/hooks/use-editor.ts` — **unchanged** (they only use existing public methods).

## TDD test list (write first, in this order)

Tests live in `packages/shared/lib/autocomplete/__tests__/phase-1/`. Use the existing `test.ts` runner pattern.

**Tokenizer (`tokenizer.test.ts`)**
1. `tokenize("Hello, world!")` → `["<s>", "Hello", ",", "world", "!", "</s>"]`
2. Preserves emoji: `tokenize("hi 🙂")` → includes `"🙂"` as its own token
3. Recovers original casing: `tokenize("Hello").surfaceForm(0)` returns `"Hello"`, key is `"hello"`
4. Handles multi-sentence text with `.`, `?`, `!` as sentence boundaries

**N-gram model (`ngram-model.test.ts`)**
5. Insert "the cat sat on the mat" + "the dog sat on the rug"; score `P(sat | the cat)` > `P(sat | the dog)` after interpolation (because "the cat sat" trigram exists)
6. Unseen trigram "the xylophone sat" backs off to bigram "xylophone sat" then unigram "sat" with correct 0.4× damping per backoff step
7. Count-pruning: after training with `minNgramCount: 2`, trigrams seen once are absent from storage but unigrams kept
8. Scoring `S(w | "<s>")` prefers sentence-initial words the corpus saw after `<s>`

**Levenshtein automaton (`levenshtein-automaton.test.ts`)**
9. `search("teh", k=1)` in a trie containing "the", "then" returns both with cost 1.0 ("the") and 2.0 ("then")
10. `search("teh", k=1)` with QWERTY weighting — `"teh" → "the"` costs 0.0 (transposition is 1.0 in plain Levenshtein but Damerau-Levenshtein transposition is treated as single edit; QWERTY-adjacent neighbors keep low cost)
11. `search("hell", k=2)` returns "hello" (cost 1.0, insertion) ranked above "help" (cost 1.0, substitution) when LM favors "hello"

**Keyboard layout (`keyboard-layout.test.ts`)**
12. `editCost('t', 'r')` returns 0.3 (adjacent QWERTY keys)
13. `editCost('q', 'p')` returns 1.0 (far apart)
14. Unknown chars fall back to 1.0

**Storage (`storage.test.ts`)**
15. `save` then `load` round-trips a trained model with identical vocabulary and counts
16. Debounced writes: 10 rapid `observe()` calls produce exactly 1 IDB write
17. Missing IDB (SSR / Node test env) falls through to in-memory map without throwing

**Incremental observe (`observe.test.ts`)**
18. `observe("foo bar foo")` twice yields `getWordFrequency("foo") === 4` (not 2)
19. After `train(base)` + `observe(userA)` + `observe(userB)`, `getNextWord(ctx)` prefers words that appeared in `userA` / `userB` given equal base counts
20. `observe("")` is a no-op, no errors

**Back-compat (`backcompat.test.ts`)**
21. All existing tests in `test.ts` still pass under the new engine
22. `getCompletions("tech")` signature unchanged; returns `string[]` sorted by frequency
23. `getNextPhrase("hello")` still works (delegates to new `suggestWord` under the hood)

**End-to-end (`e2e.test.ts`)**
24. Held-out evaluation: train on 80% of a synthetic corpus, compute top-3 next-word hit rate on the remaining 20%. Must be ≥ 0.55 on the bundled `SAMPLE_CORPUS`.
25. KSR evaluation harness: simulate typing each held-out message character-by-character; count characters avoided by accepted top suggestion. Must hit KSR ≥ 0.35.

## Edge cases & pitfalls

- **IndexedDB unavailable**: in SSR (`hooks/use-autocomplete.ts` is `'use client'`, so SSR doesn't execute it, but fallback still useful for Node tests). `storage.ts` short-circuits to in-memory Map.
- **Corpus hash collision / upgrade path**: if engine format version changes, bump `autocomplete:base:v2:<hash>`. Old key is garbage-collected on next write.
- **Extremely long input prefix** (>50 chars): skip fuzzy lookup (edit distance becomes meaningless), do exact prefix only.
- **User types faster than debounce**: `observe()` holds counts in memory immediately; only the disk write is debounced. Reads always see the latest counts.
- **Emoji across BMP boundaries** (surrogate pairs): `Intl.Segmenter` handles this correctly; do not use `string.split('')` anywhere in tokenizer.
- **Sentence-initial casing on suggestion**: `getCompletions("h")` at sentence start should return `"Hello"` surface form, not `"hello"`. Driven by whether previous token is `<s>` or sentence-ending punctuation.

## Performance budget

- Tokenization: ≤ 0.05 ms per token (Intl.Segmenter is fast but not free — batch it)
- `observe("avg message")`: ≤ 0.5 ms
- `suggestWord(context)` with fuzzy k=1: ≤ 5 ms p50 against a 20k-vocab model
- Serialized model for 20k vocab + 5-grams pruned at count≥2: ≤ 4 MB
- Cold start from IDB: ≤ 30 ms (read + deserialize), target 50 ms including React re-render

## Rollout

1. Land the new modules behind `AutocompleteV2` export, keep `Autocomplete` pointing at the current class.
2. Under a feature flag `account.settings.ai_suggestions.v2_enabled` (default off), switch `use-autocomplete.ts` to use V2 for opted-in users.
3. Ship instrumentation for KSR and top-3 hit rate (opt-in, aggregate only) for internal dogfooding.
4. After a week of green metrics, flip default to V2. `Autocomplete` becomes an alias for V2; old class removed after one more release.

## Risks & mitigations

- **QWERTY layout assumption** — users on Dvorak/Colemak get wrong proximity costs. Mitigation: expose `keyboardLayout` setting; default QWERTY. Auto-detect later via platform API if available.
- **Intl.Segmenter support** — 100% on modern evergreen browsers; confirm macOS WKWebView if Swift embeds. Fallback to regex tokenizer gated by `typeof Intl.Segmenter`.
- **Binary serialization churn** — start with JSON; measure size; convert to typed-array binary only if >10 MB. Format version byte upfront.
- **Losing existing feature parity** — covered by back-compat tests (#21–23). Any failure blocks the PR.

## Out of scope for Phase 1

- Multiple LM layers (Phase 2)
- Sentence completion (Phase 3)
- Recency-weighted counts (Phase 2)
- Gesture-typing / swipe input decoding (not a current product surface)
- Federated or DP training (not needed on single-device)
