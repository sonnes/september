# @/packages/suggestions

AI-powered partial-sentence-selection suggestions for the September composer.

## Public API

```ts
import { Suggestions, SuggestionStripes, SuggestionsForm, useStripes } from '@/packages/suggestions';
import type { SuggestionsFormData, Suggestion, Stripe, UseStripesReturn } from '@/packages/suggestions';
// Pure lib helpers
import {
  tokenize, joinTokens, hiddenTokenCount, historyMatches,
  boardWords, boardPhrases, composeSuggestions, stripeForText, appendTokens,
  MAX_COMPOSED,
} from '@/packages/suggestions';
```

### `<Suggestions chatId className?>`

Self-contained suggestions surface. Renders **sentence stripes** (word tiles — click tile _i_ to take the sentence up to that word) and **pinned word chips** sourced from the active space context.

- Chips come from single-word `- bullet` lines in the global + space context markdown.
- Stripes merge md phrases, history matches, and LLM completions.
- The already-typed prefix (`stripe.hidden` tokens) is **not** rendered — tiles show only the continuation, so typed text is never repeated.
- Tiles are colour-coded by source, reinforced by the leading `SourceMark` icon (colour is never the only channel): `md`/context → indigo (primary), `history` → teal (`chart-2`), `llm` → neutral baseline. The editor's word autocomplete reuses the same tile shape on a warm `chart-1` lane.

```tsx
<Suggestions chatId={spaceId} onPin={handlePin} />
```

The `chatId` prop accepts a space id (the name is kept for compatibility with the layered-autocomplete lower-level API).

### `<SuggestionStripes stripes pinnedChips className?>`

Lower-level stripe render; use when you supply stripes from your own `useStripes` call.
Reads `text` / `setText` from `useEditorContext()`.

### `useStripes({ chatId })`

```ts
const {
  stripes,     // Stripe[] — composed + filtered (hidden < tokens.length)
  pinnedChips, // string[] — single-word md bullets prefix-filtered against text
} = useStripes({ chatId });
```

Internally calls:
- `useSuggestions({ text, globalMd, spaceMd, history })` for LLM completions (debounced 200 ms, aborted on text change).
- `useMessages({ spaceId: chatId })` for history source (user messages only).
- `parseMdPhrases` on `account.context` (global) and `space.context` (per-space) for curated phrases and chips.
- `composeSuggestions` to merge and rank; `stripeForText` to build tiles.

### `SuggestionsForm`

Settings form for AI suggestions (provider, model, temperature, context window). Also renders the global context `TiptapEditor` (markdown, auto-saved via debounce to `account.context`). Pass `variant="setup"` in onboarding.

### Pure lib helpers (`@/packages/suggestions` — re-exported from `lib/stripes.ts`)

| Export | Purpose |
|---|---|
| `tokenize(s)` | Split sentence into word tokens (punctuation as own token) |
| `joinTokens(t[])` | Join tokens back; punctuation reattaches; trailing space added |
| `hiddenTokenCount(tokens, typed)` | Leading tokens already covered by typed text |
| `historyMatches(typed, history[])` | Past messages matching prefix, most-recent-first |
| `boardWords(entries[])` | Single-token entries (chip source) |
| `boardPhrases(entries[])` | Multi-token entries (stripe source) |
| `composeSuggestions({typed, mdPhrases, history, llm})` | Merge + dedup → `Suggestion[]` |
| `stripeForText(text, typed)` | `{ text, tokens, hidden }` for one suggestion |
| `appendTokens(text, entry)` | Append entry tokens to text; returns new string |
| `MAX_COMPOSED` | Cap on composed suggestions (6) |

Also from `lib/md.ts`:

| Export | Purpose |
|---|---|
| `parseMdPhrases(md)` | Extract `- ` / `* ` bullet lines from a markdown string → `string[]` |

### `Suggestion` type

```ts
interface Suggestion {
  text: string;
  source?: 'md' | 'history' | 'llm'; // optional — existing callers without source remain valid
  audio_path?: string;
}
```

## Context model

Suggestions draw from two markdown documents concatenated in order:

1. **`account.context`** — global md (your voice, standing facts, go-to phrases).
2. **`space.context`** — per-space md (this audience, intent, curated bullets).

Prose lines feed the LLM system prompt via `buildSuggestionPrompt`. Bullet lines (`- phrase` or `* phrase`) are parsed by `parseMdPhrases` and surface directly as chips and stripe entries. Pinning a suggestion appends `\n- ${phrase}` to the space context.

## Behavioral invariant

**Partial-take and chip-insert must NOT call `trackKeystroke`.**
The "keystrokes saved" analytic is `text_length − keys_typed`; calling `trackKeystroke` on
a suggestion-driven text change would erase the savings. `SuggestionStripes` calls only
`setText` (not `trackKeystroke`).

## LLM prompt modes

- **Empty text** → opening-utterance prompt ("Generate 5 next things to say"). Keyed on last message id.
- **Non-empty text** → completion prompt ("Complete this partial input into 5 full sentences that begin with the typed text verbatim"). Debounced 200 ms; in-flight requests aborted on text change. Each result is reconciled via `ignoreUnnecessaryDiffs` (diff-match-patch) to ensure prefix-consistency.

## Internals (not exported from package root)

- `useSuggestions` — LLM fetch hook
- `useStripes` — composition hook (exported for advanced use)
- `lib/context.ts` — `buildSuggestionPrompt` (assembles system + user prompt from global/space md + history)
- `lib/md.ts` — `parseMdPhrases`
- `lib/reanchor.ts` — `ignoreUnnecessaryDiffs` (ported from Google Project Voice)
- `SuggestionsFormSchema` — Zod schema backing `SuggestionsFormData`
