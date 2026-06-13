# @september/suggestions

AI-powered partial-sentence-selection suggestions for the September composer.

## Public API

```ts
import { Suggestions, SuggestionStripes, SuggestionsForm, useStripes } from '@september/suggestions';
import type { SuggestionsFormData, Suggestion, Stripe, UseStripesReturn } from '@september/suggestions';
// Pure lib helpers
import {
  tokenize, joinTokens, hiddenTokenCount, historyMatches,
  boardWords, boardPhrases, composeSuggestions, stripeForText, appendTokens,
  MAX_COMPOSED,
} from '@september/suggestions';
```

### `<Suggestions chatId className?>`

Self-contained suggestions surface. Renders a **BoardSelector** (segmented control across
the chat's custom keyboards), a **board-mode toggle** (fixed scanning grid via `LayoutGrid`),
**sentence stripes** (word tiles — click tile _i_ to take the sentence up to that word), and
**pinned word chips** from the active board. All state is internal.

- Board selector changes the active board; `null` = General (no board phrases/chips).
- Board-mode toggle renders the active board's buttons as a fixed grid for switch-scanning.
  Clicking a button inserts the full entry into the editor via `appendTokens + setText`.
- The public `<Suggestions chatId={chatId} className="…" />` API is **unchanged** — the chat
  page import does not need to change.

```tsx
<Suggestions chatId={chatId} />
```

### `<SuggestionStripes stripes pinnedChips className?>`

Lower-level stripe render; use when you supply stripes from your own `useStripes` call.
Reads `text` / `setText` from `useEditorContext()`.

### `useStripes({ chatId })`

```ts
const {
  stripes,       // Stripe[] — composed + filtered (hidden < tokens.length)
  pinnedChips,   // string[] — board single-words prefix-filtered against text
  boards,        // CustomKeyboard[] — all keyboards for the chat
  activeBoardId, // string | null
  setActiveBoardId,
  scanMode,      // boolean
  setScanMode,
  activeBoard,   // CustomKeyboard | null
} = useStripes({ chatId });
```

Internally calls:
- `useSuggestions({ text, context, history })` for LLM completions (debounced 200 ms, aborted on text change).
- `useMessages({ chatId })` for history source (user messages only).
- `useCustomKeyboards({ chatId })` for board entries.
- `composeSuggestions` to merge and rank; `stripeForText` to build tiles.

### `SuggestionsForm`

Settings form (unchanged). See previous README section.

### Pure lib helpers (`@september/suggestions` — re-exported from `lib/stripes.ts`)

| Export | Purpose |
|---|---|
| `tokenize(s)` | Split sentence into word tokens (punctuation as own token) |
| `joinTokens(t[])` | Join tokens back; punctuation reattaches; trailing space added |
| `hiddenTokenCount(tokens, typed)` | Leading tokens already covered by typed text |
| `historyMatches(typed, history[])` | Past messages matching prefix, most-recent-first |
| `boardWords(entries[])` | Single-token entries (chip source) |
| `boardPhrases(entries[])` | Multi-token entries (stripe source) |
| `composeSuggestions({typed, boardPhrases, history, llm})` | Merge + dedup → `Suggestion[]` |
| `stripeForText(text, typed)` | `{ text, tokens, hidden }` for one suggestion |
| `appendTokens(text, entry)` | Append entry tokens to text; returns new string |
| `MAX_COMPOSED` | Cap on composed suggestions (6) |

### `Suggestion` type

```ts
interface Suggestion {
  text: string;
  source?: 'board' | 'history' | 'llm'; // optional — existing callers without source stay valid
  audio_path?: string;
}
```

## Behavioral invariant

**Partial-take and chip-insert must NOT call `trackKeystroke`.**
The "keystrokes saved" analytic is `text_length − keys_typed`; calling `trackKeystroke` on
a suggestion-driven text change would erase the savings. `SuggestionStripes` calls only
`setText` (not `trackKeystroke`). Board-mode inserts in `Suggestions` also only call `setText`.

## LLM prompt modes

- **Empty text** → opening-utterance prompt ("Generate 5 next things to say"). Keyed on last
  message id (original behavior).
- **Non-empty text** → completion prompt ("Complete this partial input into 5 full sentences
  that begin with the typed text verbatim"). Debounced 200 ms; in-flight requests aborted on
  text change. Each result is reconciled via `ignoreUnnecessaryDiffs` (diff-match-patch)
  to ensure prefix-consistency.

## Internals (not exported from package root)

- `useSuggestions` — LLM fetch hook
- `useStripes` — composition hook (exported for advanced use)
- `lib/reanchor.ts` — `ignoreUnnecessaryDiffs` (ported from Google Project Voice)
- `SuggestionsFormSchema` — Zod schema backing `SuggestionsFormData`
