# @/packages/suggestions

AI-powered partial-sentence-selection suggestions for the September composer.

## Public API

```ts
import {
  SuggestionStripes,
  Suggestions,
  SuggestionsForm,
  useStripes,
} from '@/packages/suggestions';
import type {
  Stripe,
  Suggestion,
  SuggestionsFormData,
  UseStripesReturn,
} from '@/packages/suggestions';
// Pure lib helpers
import {
  MAX_COMPOSED,
  appendTokens,
  boardPhrases,
  boardWords,
  composeSuggestions,
  stripePhrases,
  hiddenTokenCount,
  historyMatches,
  joinTokens,
  stripeForText,
  tokenize,
} from '@/packages/suggestions';
```

### `<Suggestions chatId className? historyText?>`

Self-contained suggestions surface. Renders **sentence stripes** (word tiles — click tile _i_ to take the sentence up to that word) and **pinned word chips** sourced from the space's saved phrases.

- Curated stripes/chips come from the space's **saved phrases** (pinned first) via `useSavedPhrases` — not from parsing context markdown. The 5-row curated budget mixes phrase rows with up to 2 **starter** rows (`kind: 'starter'` — 3–5-word opening prefixes).
- Stripes merge saved phrases, starters, history matches, and LLM completions — plus a **code match** row pinned to the top when the word at the caret equals a phrase's code (`ty` → "Thank you"). The code lookup is local and exact (cross-space; current space wins), so it never waits on the LLM debounce.
- **Order follows the composer.** Blank: saved phrases → starters → LLM, so an empty stripe shows what the user keeps. Typing: history → LLM → saved phrases → starters, because the grounded and generated rows continue the words already there. `stripePhrases` applies the curated cap *after* dropping single-word entries, so a chip-only phrase never consumes a stripe row.
- The already-typed prefix (`stripe.hidden` tokens) is **not** rendered — tiles show only the continuation, so typed text is never repeated. A code stripe's text is the composer text with the trailing code replaced (`codeExpansionText`), so taking it consumes the typed trigger through the ordinary take path.
- Tiles are colour-coded by source, reinforced by the leading `SourceMark` icon (colour is never the only channel): `md`/context → indigo (primary), `history` → teal (`chart-2`), `llm` → neutral baseline, `code` → strong indigo tint with the code chip in the gutter, `starter` → dashed indigo tint with a chevrons gutter. The editor's word autocomplete reuses the same tile shape on a warm `chart-1` lane.
- End key by row kind: phrases/history/llm/code get the speak `↵` (when `onSubmit` is passed); starters get an `…` key that takes the whole prefix into the composer instead — a starter is an opening move, never spoken as-is.

```tsx
<Suggestions chatId={spaceId} onPin={handlePin} />
```

The `chatId` prop accepts a space id (the name is kept for compatibility with the layered-autocomplete lower-level API).
Pass `historyText` when the composer should use note text instead of chat history for LLM suggestions and history-sourced stripe matches, like Notes mode.

### `<SuggestionStripes stripes pinnedChips className?>`

Lower-level stripe render; use when you supply stripes from your own `useStripes` call.
Reads `text` / `setText` from `useEditorContext()`.

Each stripe renders on a **single line** (`flex-nowrap`). Tile font/padding/min-height
scale by one uniform factor from `useStripeScale` so the _longest_ stripe fits the
container width — measured with Pretext (`@chenglou/pretext`), the same engine the
display reel uses. Tiles never wrap; an over-long stripe (past the min-scale floor)
scrolls horizontally instead (with the scrollbar hidden — the row stays scrollable).

Pass `onSubmit` to add a trailing **enter** button to each stripe that accepts the
whole stripe (full draft + suggestion) and speaks it in one tap.

### `useStripes({ chatId, historyText })`

```ts
const {
  stripes, // Stripe[] — composed + filtered (hidden < tokens.length)
  pinnedChips, // string[] — single-word md bullets prefix-filtered against text
} = useStripes({ chatId, historyText });
```

Internally calls:

- `useSuggestions({ text, globalMd, spaceMd, history })` for LLM completions (debounced 200 ms, aborted on text change). `globalMd`/`spaceMd` steer the LLM via the system prompt's `<user_context>` block.
- `historyText` when provided; otherwise `useMessages({ spaceId: chatId })` for history source (user messages only).
- `useSavedPhrases({ spaceId: chatId })` for the curated phrases/starters and chips (pinned first; starters via `topRows(_, 2, 'starter')`, phrases fill the rest of the 5-row budget) — plus an unscoped `useSavedPhrases()` so codes from **all** spaces match (`matchCode` on `trailingWord(text)`).
- `composeSuggestions` to merge and rank; `stripeForText` to build tiles; a matched code prepends its stripe above everything.

### `SuggestionsForm`

Settings form for AI suggestions (provider, model, temperature, context window). Also renders the global context `TiptapEditor` (markdown, auto-saved via debounce to `account.context`). Pass `variant="setup"` in onboarding.

### Pure lib helpers (`@/packages/suggestions` — re-exported from `lib/stripes.ts`)

| Export                                                 | Purpose                                                        |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `tokenize(s)`                                          | Split sentence into word tokens (punctuation as own token)     |
| `joinTokens(t[])`                                      | Join tokens back; punctuation reattaches; trailing space added |
| `hiddenTokenCount(tokens, typed)`                      | Leading tokens already covered by typed text                   |
| `historyMatches(typed, history[])`                     | Past messages matching prefix, most-recent-first               |
| `boardWords(entries[])`                                | Single-token entries (chip source)                             |
| `boardPhrases(entries[])`                              | Multi-token entries (stripe source)                            |
| `stripePhrases(entries[], n)`                          | Multi-token entries, capped after the filter                   |
| `composeSuggestions({typed, mdPhrases, starters?, history, llm})` | Merge + dedup → `Suggestion[]`                      |
| `stripeForText(text, typed)`                           | `{ text, tokens, hidden }` for one suggestion                  |
| `appendTokens(text, entry)`                            | Append entry tokens to text; returns new string                |
| `codeExpansionText(typed, phrase)`                     | Composer text with the trailing code replaced by the phrase    |
| `MAX_COMPOSED`                                         | Cap on composed suggestions (6)                                |

Also from `lib/md.ts`:

| Export               | Purpose                                                              |
| -------------------- | -------------------------------------------------------------------- |
| `parseMdPhrases(md)` | Extract `- ` / `* ` bullet lines from a markdown string → `string[]` |

### `Suggestion` type

```ts
interface Suggestion {
  text: string;
  // optional — existing callers without source remain valid.
  // 'code' = phrase surfaced by its typed code; 'starter' = opening prefix.
  source?: 'md' | 'history' | 'llm' | 'code' | 'starter';
  audio_path?: string;
}
```

## Context model

Suggestions draw from two markdown context files concatenated in order:

1. **`account.context`** — global md (your voice, standing facts, go-to phrases).
2. **`space.context`** — per-space md (this audience, intent, curated bullets).

Both files feed the LLM system prompt via `buildSuggestionPrompt`, which wraps them in a `<user_context>` block (omitted entirely when both are empty; context is not repeated in the user message). They are **no longer** parsed for the curated stripe — that source is now the space's saved phrases (see `@/packages/spaces`). Pinning a suggestion calls `addManualPhrase`, saving it as a pinned (durable) phrase for the space.

## Behavioral invariant

**Partial-take and chip-insert must NOT call `trackKeystroke`.**
The "keystrokes saved" analytic is `text_length − keys_typed`; calling `trackKeystroke` on
a suggestion-driven text change would erase the savings. `SuggestionStripes` calls only
`setText` (not `trackKeystroke`).

## LLM prompt modes

- **Empty text** → opening-utterance prompt ("Generate 5 next things to say"). Keyed on last message id.
- **Non-empty text** → completion prompt ("Complete this partial input into 5 full sentences that begin with the typed text verbatim"). Debounced 200 ms; in-flight requests aborted on text change. Each result is reconciled via `ignoreUnnecessaryDiffs` (diff-match-patch) to ensure prefix-consistency.

Both modes use structured output (`generate` with a `{ suggestions: string[] }` Zod schema) — no raw-JSON parsing of the model reply. Both ask for 5-7 word sentences (completion mode counts the typed prefix, relaxed when the input is already longer).

## Internals (not exported from package root)

- `useSuggestions` — LLM fetch hook
- `useStripes` — composition hook (exported for advanced use)
- `lib/context.ts` — `buildSuggestionPrompt` (assembles system + user prompt from global/space md + history)
- `lib/md.ts` — `parseMdPhrases`
- `lib/reanchor.ts` — `ignoreUnnecessaryDiffs` (ported from Google Project Voice)
- `SuggestionsFormSchema` — Zod schema backing `SuggestionsFormData`
