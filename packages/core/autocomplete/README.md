# Autocomplete

This module gives word completions and next-word predictions for the Talk and Notes composers.

## Engine

`Autocomplete` blends three n-gram models with Stupid Backoff:

- the seed sentences in `corpus.ts`
- every message that the user wrote
- the messages that the user wrote in the current space

A space model reaches its full weight after 500 tokens. `observe(text, spaceId)` adds one message of the user.

Completions come from the word counts. The dictionary adds to the word counts only, and never to an n-gram model.

## Stripe

`createEngine()` trains the engine on the corpus and the dictionary. `suggestionsFor()` returns at most `MAX_SUGGESTIONS` (6) words for the composer text. After a finished word, learned audio tags come after the words.

`applySuggestion()` replaces the partial word and adds a trailing space. A tag never replaces a word.

## Corpus and Dictionary

`dictionary.ts` holds the 5,000 most frequent words of spoken English. The list comes from OpenSubtitles 2018 word counts, under the MIT License.

To rebuild the dictionary, run this command from `apps/desktop`:

```sh
node scripts/build-dictionary.mjs
```

## Tests

Run the tests from the repository root:

```sh
pnpm --filter @september/core test
```

`savings.test.ts` holds a floor for the keystroke saving on unseen sentences.
