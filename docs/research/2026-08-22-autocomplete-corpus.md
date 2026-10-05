---
title: The seed dictionary and corpus for autocomplete
description: The words that the desktop engine starts with cover half of common English. A spoken-register dictionary of 5,000 words raises keystroke savings from 37% to 48%.
package: desktop
---

# The seed dictionary and corpus for autocomplete

- **Scope:** `apps/desktop/src/autocomplete/corpus.ts`, and the identical copy at `apps/web/public/corpus.txt`
- **Status:** recommendation 1 (the dictionary layer) is implemented. See `docs/concepts/autocomplete-dictionary.md`. Recommendations 2 to 5 are open.
- **Date:** 2026-08-22

## Summary

The engine starts with 214 written sentences and no dictionary. This is too
little material in every direction. A user who writes everyday speech finds
that 22% of their words are not known to the app at all.

A word list of 5,000 spoken-register words raises measured keystroke savings
from 37% to 48%. The list costs 34 KB and 1.7 ms at start. This is the single
largest gain available, and it needs no change to the model.

## How the measurement works

Two sets of held-out sentences model the two things a September user writes:
40 care requests ("please turn me onto my left side") and 10 social lines ("it
was lovely to see you yesterday"). No sentence comes from the seed corpus.

A simulator types each sentence one character at a time. At each character it
reads the 6 word tiles that `suggestionsFor` gives. If a tile holds the word
that comes next, the simulator takes the tile for one keystroke. The result is
the keystroke saving rate: the fraction of characters that the user does not
press.

The engine ranks words by frequency, and an external frequency list is not
tuned to these sentences. The size of the gain is therefore a property of the
list, not of the test set.

## What the engine starts with today

| Property | Value |
| --- | --- |
| Corpus size | 10,536 characters, 214 lines |
| Word tokens | 1,855 |
| Word types | 754 |
| Types that appear one time only | 529 (70%) |
| Of the 300 most common English words, known | 146 |
| Of the 1,000 most common English words, known | 302 |
| Out-of-vocabulary rate, held-out speech | 22.4% of tokens |

The corpus is a set of example sentences. It is not a dictionary, and it was
not built to cover the language. Half of the commonest words in English are
absent.

The words that a September user needs most are among the absent ones. The
held-out sentences use 57 word types that the engine does not know. These
include `yes`, `no`, `bed`, `nurse`, `sleep`, `cold`, `love`, `stop`, `turn`,
`open`, `give`, and `hear`. Of those 57, a general 10,000-word English list
holds 52.

At the same time the corpus holds `audiologist`, `documentary`, `waterlogged`,
and `spectacular`. The median rank of a seed word in general English is 1,090.
The p90 rank is 5,355. The corpus spends its 1,855 tokens on mid-frequency
topical words while the core of the language is missing.

## Measured options

All figures are keystroke savings. Higher is better.

| Seed material | Care set | Social set |
| --- | --- | --- |
| Today (214 sentences) | 36.7% | 40.1% |
| Sentences removed, 5,000-word dictionary only | 43.4% | — |
| Today + 5,000-word dictionary | **47.7%** | **51.1%** |

The two parts are complementary. The dictionary gives breadth, so a prefix
always has candidates. The sentences give the n-gram model its context, so the
next word after `can you` is `help`. Neither part replaces the other.

### The register of the list matters

Two lists of 10,000 words, one from web text and one from film subtitles:

| Source | Care set |
| --- | --- |
| Web text (Google Web 1T) | 43.6% |
| Speech (OpenSubtitles 2018) | **47.6%** |
| Both together | 47.4% |

Subtitles are the closest free proxy for the speech that an AAC user produces.
The ranks show why:

| Word | Rank in web text | Rank in speech |
| --- | --- | --- |
| `sorry` | 2,263 | 120 |
| `tired` | 5,678 | 727 |
| `yes` | 484 | 71 |
| `hungry` | 8,710 | 964 |
| `hurts` | absent | 1,564 |

Adding the web list on top of the speech list gains nothing.

### How many words to ship

| Words | Care set | Raw size |
| --- | --- | --- |
| 500 | 41.5% | 3 KB |
| 1,000 | 43.3% | 6 KB |
| 2,000 | 45.4% | 13 KB |
| **5,000** | **47.7%** | **34 KB** |
| 10,000 | 47.6% | 72 KB |
| 20,000 | 47.9% | 150 KB |

The curve is flat after 5,000 words. Ship 5,000.

### A core vocabulary layer

176 hand-picked core words, given a high weight over the 10,000-word list,
raise the care set from 47.6% to 48.7%. The same 176 words alone, with no
other material, give 41.2%. That is better than the whole 10 KB corpus of
today.

The gain over a good frequency list is small. The value of the layer is
control: it lets the app promote `suction`, `catheter`, or `hoist`, which no
general list ranks highly.

### Cost at start

Training the seed corpus takes 2.9 ms. Loading 5,000 weighted words into the
trie takes 1.7 ms. The start stays inside the current budget.

## Licenses

| List | License | Verdict |
| --- | --- | --- |
| hermitdave/FrequencyWords, OpenSubtitles 2018 | MIT | Use this one |
| google-10000-english | Derived from LDC Google Web 1T | Do not ship |

The `google-10000-english` license note advises against commercial use without
a license from the Linguistic Data Consortium. It was used here for
measurement only.

## Faults in the wiring, not the corpus

These four faults cap what any corpus can do. Each one is in
`src/autocomplete/index.ts`, not in the model.

1. **A typo gives no words at all.** `suggestionsFor` calls
   `getCompletions`, which needs an exact prefix. The engine already holds
   QWERTY-weighted fuzzy matching in `suggestWord`, which turns `pleese` into
   `please` and `watr` into `water`. Nothing calls it. A user with motor
   difficulty mistypes often, and that is when the tiles matter most.
2. **A part-written word ignores the sentence.** `I need to g` and
   `please pass the g` give the same six words. `suggestWord` reads both the
   prefix and the context; `getCompletions` reads the prefix only.
3. **An empty composer gives no words.** The tokenizer writes `<s>` markers
   for exactly this purpose, but `suggestionsFor` returns an empty list when
   the text is empty. Sentence openers are the highest-value prediction, and
   the app never shows them.
4. **The tiles are lower case.** The engine normalizes to lower case, and
   `applySuggestion` writes the word unchanged. A user who takes the tile `i`
   gets `I want i `.

CAUTION: Do not move `suggestionsFor` onto `suggestWord` before the corpus
grows. Measured on today's corpus, the change lowers the care set from 36.7%
to 33.7%. The blended score puts 60% of its weight on context, and 70% of the
seed vocabulary appears one time only, so the context evidence is noise.
Repeat the measurement after the dictionary lands.

## The India-English lines

39% of the corpus (4,113 characters) is Indian-English small talk. Removing it
lowers the care set from 36.7% to 32.8%. The lines are useful conversational
material and must stay.

The correct treatment is a separate pack that the user turns on, not lines
baked into the base layer of every user. The user layer already learns the
same dialect from the messages that the user sends.

## Recommendation, in order

1. **Ship a 5,000-word spoken-register dictionary as a weighted trie layer.**
   Source: hermitdave/FrequencyWords, MIT. Load it into the trie and the word
   frequency map only. Do not feed it to the n-gram model, because a flat word
   list holds no real bigrams. Expected: 37% to 48%.
2. **Correct the four wiring faults above**, in the order 3, 4, 1, 2.
   Sentence openers and capitals are small and visible. Fuzzy matching and
   context need the corpus first.
3. **Grow the sentence corpus with everyday speech**, not written prose. Keep
   the care requests and the small talk. Target 3,000 to 5,000 sentences,
   which is 10 to 20 times the material of today.
4. **Add a core-vocabulary layer of 150 to 300 words** for the terms that a
   general list ranks too low: `suction`, `hoist`, `catheter`, `commode`.
5. **Move the India-English lines into an optional pack.**

## Reproduce the measurement

The harness is now `apps/desktop/tests/autocomplete-savings.test.mjs`. It holds
the two held-out sets and a floor under each saving rate.

## Both apps share this corpus

`apps/web/public/corpus.txt` is byte-identical to the desktop `SEED_CORPUS`.
The web app reads it at run time, so a larger corpus costs it nothing. Any
change lands in both apps.
