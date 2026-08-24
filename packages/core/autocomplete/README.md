# Autocomplete

This package supplies word completions and next-word predictions for the Talk and Notes composers.

## Engine

`Autocomplete` combines these parts:

- a trie for prefix matches
- a 5-gram model with Stupid Backoff
- a QWERTY-weighted fuzzy match
- a shared base layer, user layer, and per-space layer
- recency weighting for learned text

The engine accepts new messages through `observe(text, { chatId })`. The web service reads each user message from the main repository one time.

## Desktop stripe contract

`createEngine()` trains the engine with the spoken corpus and dictionary. `suggestionsFor()` returns at most six words for the current composer text.

`applySuggestion()` replaces the partial word and adds a trailing space. This operation saves the next separator keystroke.

## Corpus and dictionary

`corpus.ts` teaches word order from spoken sentences. `dictionary.ts` gives prefix coverage for 5,000 common spoken words.

The dictionary comes from OpenSubtitles 2018 word counts. The source list uses the MIT License.

Run this command from `apps/desktop` to rebuild the dictionary:

```sh
node scripts/build-dictionary.mjs
```

The command writes `packages/core/autocomplete/dictionary.ts`, which both apps
import.

## Persistence

The web app does not persist an autocomplete snapshot. It trains the base engine at start and learns from repository messages.

This package can serialize an engine snapshot for tests and future adapters. It does not open IndexedDB.

## Tests

Run the package test command from the repository root:

```sh
pnpm --filter @september/core test
```

The tests cover tokenization, n-gram scoring, fuzzy matches, recency, snapshots, and the six-word stripe contract.
