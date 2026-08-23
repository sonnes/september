---
title: The autocomplete dictionary
description: The engine ships 5,000 words of spoken English beside the seed sentences, so that a part-written word always has candidates.
package: desktop, shared
---

# The autocomplete dictionary

The word engine starts with two kinds of material, and they do different work.

`corpus.ts` holds example sentences. These teach the n-gram model which word
comes after which, so that `can you` offers `help`.

`dictionary.ts` holds the 5,000 most frequent words of spoken English, in order
of frequency. These give the prefix index its breadth, so that a part-written
word always has candidates.

## Why both are necessary

The sentences alone cover 146 of the 300 commonest words in English. Before the
list arrived, 22% of the words in everyday speech were unknown to the app.
`nurse`, `bed`, `sorry`, `yes`, `no`, `sleep`, and `cold` all gave nothing.

Measured on 30 care requests that the engine never saw:

| Material | Keystrokes saved |
| --- | --- |
| Sentences only | 37.6% |
| Word list only | 43.4% |
| Both | 47.8% |

`apps/desktop/tests/autocomplete-savings.test.mjs` holds a floor under these
numbers. A change that lowers the saving fails the build.

## Where the words come from

The source is the OpenSubtitles 2018 word counts of hermitdave, under the MIT
license. Subtitles record speech, and speech is what a September user writes.

Register decides the ranking, and the ranking decides which word reaches a
tile. A list built from web text ranks `sorry` at 2263 and `tired` at 5678. The
speech list ranks them at 120 and 727. Measured against each other, the speech
list saves 47.6% of keystrokes and the web list saves 43.6%.

The list stops at 5,000 words. At 10,000 and at 20,000 the saving does not go
up, and the file becomes larger.

## How the engine holds them

`seedDictionary(words)` puts the words in the trie and the word-frequency map.
It never touches the n-gram model, because a flat word list holds no real pairs
of words. A false pair would push a wrong word to the top of a row.

Weight falls as the square root of the rank. This is near the shape of word
frequency in English, and it keeps the counts small enough that the words of
the user can still catch up.

Call `seedDictionary` after `train()` or after `restoreFromSnapshot()`. Both of
those clear the engine.

## Words that the list does not hold

The script removes slurs and strong obscenity. A user of September points with
less accuracy than a user of a mouse, and a wrong tap speaks the word aloud.
Mild words such as `damn` and `hell` stay, because they are ordinary speech.

This blocks the list, not the user. The user layer still learns every word that
the user writes, so nobody loses their own vocabulary.

## Rebuild the list

Run `node scripts/build-dictionary.mjs` from `apps/desktop`. The script writes
the same file to `apps/desktop/src/autocomplete/` and to
`apps/web/src/packages/shared/lib/autocomplete/`. The two engines must stay the
same.
