---
title: The word being read
description: While the voice speaks a message, Talk marks the word that the voice reads in indigo. Only the browser system voice reports its words.
package: core, app-ui, web
---

# The Word Being Read

While the voice speaks a message of Talk, Talk marks the word that the voice
reads. The mark is indigo with white words. Amber marks attention only, so the
word that is read is not amber.

The voice reports the place of a character in the text that it speaks. The
screen marks a word by its place in the sentence, not by the place of a
character.

`packages/core/rules/spoken-word.ts` holds two rules:

- `wordAt(text, charIndex)` gives the place of the word that holds a
  character. A character on a space belongs to the word after it.
- `wordsOf(text)` cuts a text into words and the spaces between them. Each
  word has its place.

## Voices

The web speech service calls `wordAt` on each word boundary of the browser
system voice. `useSpokenWord` gives the word and the id of the thing that
speaks it. `SpokenText` in `packages/app-ui/blocks/suggestions.tsx` draws a
text with `wordsOf` and marks the word with the same id.

The cloud voices and the native desktop voice do not report word boundaries.
With them, `useSpokenWord` gives nothing, and no word is marked. A message that
holds audio tags shows its tags as chips, and no word is marked.

Notes and Present do not mark the word being read.
