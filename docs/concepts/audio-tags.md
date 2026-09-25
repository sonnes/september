---
title: Audio tags and moods
description: Eleven v3 reads directions in square brackets, such as [laughs]. Five mood keys set the tone of the suggestions, and tags come in suggestions, phrases, and the word row.
package: core, app-ui, desktop, web
---

# Audio Tags and Moods

An audio tag is a direction to the voice in square brackets, such as
`[laughs]` or `[clears throat]`. Eleven v3 reads a tag and does not say it.
Every other voice says the words inside the brackets. The rules are in
`packages/core/rules/audio-tags.ts`.

## Which Voice Gets Tags

`tagsSpoken(settings)` is true for the ElevenLabs Dialogue voice, and for the
ElevenLabs voice with `eleven_v3`. It is false for all other voices.
`speakableText` removes the tags for a voice that cannot read them.

| Path | Tags spoken | Tags not spoken |
| --- | --- | --- |
| Speak, the speak key of a row, replay, Read aloud, Present | Kept | Removed |
| Fallback to the system voice | Removed | Removed |
| Note audio and video export (`fileSound`) | Kept. Dialogue uses `eleven_v3`, the stability of the stream, and the normal speed. | Removed |
| Tag rules in the suggestion and phrase prompts | Present | Absent |
| Tag tiles in the word row | Shown | Not shown |
| Captions | `alignmentToWords` skips tags. | Same |

A draft, a message, and a phrase always keep their tags. The tags are removed
only on the way to a voice.

## Moods

Five emoji keys in the Talk composer, left of the audio output, set the mood:
😊 Warm, 😄 Playful, 😔 Low, 😤 Frustrated, and 😠 Angry. One press chooses a
mood. A second press on the same key clears it. The mood is saved for each
space as `talk-mood:<spaceId>`, beside the draft, and it stays until the user
changes it.

`packages/core/rules/moods.ts` holds each mood: its instructions and its
example tags. `buildSuggestionPrompt` puts the mood block in `<user_context>`,
after the speaking style and the space note. The mood changes the wording for
every voice. A change of mood sends a new suggestion request at once.

When tags are spoken, the suggestion prompt also gets an `<audio_tags>` block.
The block lets the model choose any tag that describes the voice. The example
tags of the mood, or the default examples, are examples only. The app does not
filter the tags that the model writes.

## Tags in Suggestions

The model writes tags inside the suggestion text. The response is still a list
of strings.

- `tokenize` in `rules/stripes.ts` keeps a tag as one token.
- The prefix match compares the words and skips the tags.
- A tag does not count toward the six words of a slice.
- A tag after the last sentence stays with that sentence.
- A tag before the typed words is a lead tag. The row shows it first, and
  `takeTokens` puts it at the start of the draft.
- A tag that the user typed stays where the user typed it when the user takes
  a row without that tag.

The word engine in `packages/core/autocomplete` reads a tag as a `tag` token.
It learns tags from sent messages. `suggestionsFor` puts up to two learned tags
after the words. `wordRow` then adds the example tags of the mood, skips a tag
that the draft holds, and shows at most two tag tiles. A tag tile adds its tag
after a part-written word and keeps the word. A draft that ends in a tag is at
a word boundary.

## Tags in Phrases

A phrase can start with a tag, for example `[laughs] That is hilarious`.
`generateCode` reads the words only, so a tag does not change the code. When
tags are spoken, the phrase prompt lets the model add one tag to a phrase with
a clear feeling. The phrase prompt does not get the mood, because a phrase
stays in a space longer than one mood.

## The Composer

The composer is a `textarea`. A layer behind it has the same type and wrap,
and it draws a chip under each tag. The text of the layer is clear, so the
field on top keeps the caret, the selection, and what a screen reader hears.
Backspace directly after a tag removes the whole tag. Delete last word also
removes a tag as one word.

Messages, phrase rows, and suggestion rows show each tag as a chip with the
words of the tag.
