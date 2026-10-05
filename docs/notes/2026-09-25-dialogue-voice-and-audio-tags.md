---
plan: ../plans/2026-09-25-dialogue-voice-and-audio-tags.md
---

# Dialogue Voice and Audio Tags Implementation Notes

## Part 1: Dialogue Voice

- The frame check (step 1) is not done. No ElevenLabs key was available in this session. Both parsers read complete JSON objects one after the other, so they work with or without a line break between objects. A real request must still confirm the stream shape.
- The time to the first sound (step 10) is not measured yet. It needs a key and a live voice.
- The Dialogue voice uses the `cloudVoice` provider of `speech.ts`. Only the usage model changes to `eleven_v3`. The web `streamSpeech` sends a `dialogue` sentence to `streamDialogue`. The desktop `speech_stream` command sends it to `speak_dialogue_stream` in Rust. The TypeScript speech providers of both apps therefore stay equal.
- The web sample player moved out of `playStream` into `pcmPlayer`. The socket and the Dialogue stream both use it. The cache lookup moved into `keptBlob`.
- `dialogue_parts` in `speech.rs` repeats the rule of `dialogueParts` in `packages/core`, because Rust cannot import the TypeScript rule. Both have the same tests.
- Desktop `speech::stream` now fails with "ElevenLabs sent no sound." when a complete stream has no samples. Before, the socket path kept an empty WAV file. The web app already failed in this case.
- A new voice clone keeps the Dialogue service when the Dialogue service is in use. Before, a clone always switched the service to ElevenLabs.
- The onboarding voice choice and its backup field keep two values. The `speech` setting and its backup field accept `dialogue`.

## Part 2: Audio Tags

- `fileSound` is in `packages/core/rules/audio-tags.ts`, not in each app. The web `synthesizeSpeech` and `synthesizeTimed` and the desktop `synthesizeSpeech` use it, so an export follows the same rule on both.
- The example tags go in the `<audio_tags>` block of the prompt, not in the `<mood>` block of the mock. Thus a prompt without a mood still gets examples, and a voice without tags gets the mood alone.
- The tag rules tell the model that a tag can come before the typed input. The completion prompt still requires the words to begin with the typed input verbatim.
- A take replaces the draft with the suggestion up to the pressed tile, as it did before. The covered words come from the row, and the tags that the user typed stay in their places. A tag after a part-written word is lost, because the take replaces that word.
- Two suggestions with the same words and other tags are one row. The first one wins.
- The word engine has a new token kind, `tag`. The n-gram model learns it. The word trie does not, so a part-written word never completes into a tag.
- A mood change sends a request only when the draft ends at a word boundary, as a text edit does. An empty draft sends nothing.
- The phrase prompt marks kept rows with `[pinned]`. Its tag rules say that `[pinned]` is a marker of the app, not an audio tag.
- Four web test files mocked `@platform/services/os` without `currentSpeech`. The suggestion rows and phrase sync now read the voice settings, so those mocks got `currentSpeech: () => null`. Two mocks returned `{ data: [] }` from `useSuggestions`, which returns a list. They now return `[]`.

## Addendum: Eleven v3 Conversational

- `playStream` on web and `speak_stream` in Rust now call one socket reader, `playSocket` and `socket_stream`. The text-to-speech socket and the dialogue socket differ only in the address, the messages, and the spelling of the final mark (`isFinal` or `is_final`).
- The dialogue socket takes more than one `inputs` frame, so the parts of a long text go in one socket, not one socket each.
- `elevenLabsCredits` has no rate for `eleven_v3_conversational`, because the ElevenLabs model page gives none. Its usage records therefore have the cost source `unknown`.
- A socket for this model is not checked against the real service. The time to the first sound is not measured.

## Addendum: Review Fixes

- A tag tile after a part-written word keeps the word and adds the tag after it. A tag does not complete a word.
- `fileSound` gives a Dialogue file the stability mode of the stream and a speed of 1. Before, an export used the raw stability and the speed of the ElevenLabs voice.
- `dialogueParts` keeps punctuation at the start of a text, as `dialogue_parts` in Rust does. Before, `"?!"` gave no parts.
- The web Dialogue stream fails when it ends inside a reply, as the Rust stream does. The sentence is not kept.
- `playSocket` and `playDialogue` share one player, `playArriving`. The speech cache keys share one hash, `blobId`. The keys did not change, so the kept sentences still play.
- The desktop backup accepts the `dialogue` provider and keeps `dialogueModelId`.
- `eleven_v3_conversational` still has no credit rate. See the addendum above.
