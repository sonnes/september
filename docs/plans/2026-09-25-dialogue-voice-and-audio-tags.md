# Dialogue Voice and Audio Tags

Status: Approved on 2026-09-25, with tag chips in the composer.

Mock: [`docs/mocks/2026-09-25-audio-tags-options.html`](../mocks/2026-09-25-audio-tags-options.html)

## Scope

This plan has two parts. Part 1 must be complete before Part 2 starts.

1. **Dialogue voice.** A third voice service, "ElevenLabs Dialogue", speaks through the ElevenLabs Text to Dialogue stream with Eleven v3.
2. **Audio tags.** Moods, tags in suggestions, tags in the word row, and tag handling on every speech path.

Out of scope: speech from more than one speaker, the macOS keyboard, and onboarding. Onboarding keeps its two voice choices.

## Why a Separate Service

Eleven v3 reads audio tags. Today Eleven v3 uses the file path, because the text-to-speech socket does not accept it. The app waits for the complete MP3 file before the first sound.

The Text to Dialogue stream accepts Eleven v3 over HTTP and sends the sound in parts. A separate service keeps this path apart from the ElevenLabs service and its socket. The two paths have different limits:

| | ElevenLabs | ElevenLabs Dialogue |
| --- | --- | --- |
| Endpoint | TTS socket, or the TTS file for v3 | `POST /v1/text-to-dialogue/stream/with-timestamps` |
| Model | The user picks one | Always `eleven_v3` |
| Stability | A range, or three modes on v3 | Three modes: 1.0, 0.5, 0.0 |
| Similarity | Yes, except on v3 | Not sent. Eleven v3 has no similarity setting. |
| Speed | Yes | No. The endpoint has no speed field. |
| Text limit | 5,000 characters | 2,000 characters for each request |

## Part 1: Dialogue Voice

### Protocol

The request:

```
POST https://api.elevenlabs.io/v1/text-to-dialogue/stream/with-timestamps?output_format=pcm_24000
xi-api-key: <key>

{
  "inputs": [{ "text": "<sentence>", "voice_id": "<voiceId>" }],
  "model_id": "eleven_v3",
  "settings": { "stability": <0 | 0.5 | 1> }
}
```

Each item in the response stream is one JSON object:

```
{ "audio_base64": "<base64>", "alignment": { ... }, "normalized_alignment": { ... }, "voice_segments": [ ... ] }
```

The sound is `pcm_24000`, the same format as the socket. Both apps therefore use their current players: `AudioContext` on web and `AVAudioEngine` on desktop.

The API reference does not give the frame format of the stream. The text-to-speech stream with timestamps sends one JSON object on each line. The parser therefore reads complete JSON objects one after the other, and a line break between them is optional.

### Long Text

A request holds at most 2,000 characters. `dialogueParts(text)` in `packages/core` cuts a longer text at sentence ends. Each part is at most 2,000 characters. A sentence longer than 2,000 characters is cut at the last space before the limit. The parts play one after the other in one `speak()` call. Talk sentences are short, so this step matters for Read aloud in Notes and for Present.

### Failure and Stop

The same table as the streaming voice applies, with one change. The first sound of Eleven v3 comes later than the first sound of Flash. The limit for the first sound is 10 seconds for this service. Step 10 measures the real time.

| Event | Result |
| --- | --- |
| The request fails before the first sound | The system voice speaks the sentence, and the current notice appears. |
| No sound within 10 seconds | Same as a failure before the first sound. |
| The stream fails after the first sound | `InterruptedSpeech`. The sound stops, and the system voice does not start. |
| Stop, or a new sentence | The app cancels the request and stops the sound. |
| A 401 or 403 answer | The key is wrong. The reason shows in the notice. |

### Cache

A complete sentence is kept as a WAV file, as the streaming voice does.

| App | Cache name |
| --- | --- |
| Web | `dialogue:<sha256>:pcm`. The hash covers the text, the voice, and the stability. |
| Desktop | `audio/<sha256>.wav`. `speech::file_name` already includes the provider, so no new rule is necessary. |

The web name has its own prefix. Thus a dialogue file never uses the name of a TTS file with the same settings.

### Steps

1. **Frame check.** Send one real request with a test key. Record the raw bytes of the response in `docs/notes/`. The parser in steps 4 and 6 reads one JSON object after the other, with or without a line break between them. Thus it works for both frame formats.
2. **Core rules** (`packages/core/rules/voice.ts`). Add `DIALOGUE_MODEL = "eleven_v3"`, and `dialogueParts(text, limit = 2000)`. Write the tests first.
3. **Service type.** Add `"dialogue"` to `VoiceService` in `apps/web/src/services/speech.ts` and `apps/desktop/src/services/speech.ts`. Add `"dialogue"` to the speech provider in `packages/core/rules/backup.ts`, so that a backup with this service loads. The onboarding type does not change.
4. **Web stream** (`apps/web/src/services/os.ts`).
   - Move the sample player out of `playStream` into one function that takes base64 chunks. The socket path and the dialogue path both use it.
   - Add `streamDialogue(text, settings, signal)`. It reads the response body with a reader, takes each complete JSON object, and sends its `audio_base64` to the player.
   - Keep the WAV file after the last part plays.
5. **Web provider** (`speech.ts`). Add `dialogueVoice(settings)`. It has the same usage record and fallback as `cloudVoice`, with the model `eleven_v3`. `providerFor` returns it for `"dialogue"`.
6. **Desktop stream** (`src-tauri/src/providers.rs`). Add `speak_dialogue_stream(key, settings, text, on_samples)`. It uses `reqwest` with a byte stream, the same odd-byte carry, and the same first-sound timeout. `speech::stream` calls it when `settings.provider == "dialogue"`. The `speech_stream` command does not change. Add a test with a fake HTTP server in `tests/providers.rs`.
7. **Desktop provider** (`apps/desktop/src/services/speech.ts`). The same change as step 5.
8. **Voice screen** (`packages/app-ui/pages/voice.tsx`). Add a third choice: "ElevenLabs Dialogue". The text is "Eleven v3 voices that can laugh, sigh, and whisper. They start to speak later. It needs your ElevenLabs key." The voice list shows for both ElevenLabs services.
9. **Voice tab** (`packages/app-ui/blocks/speech-settings.tsx`). For Dialogue, hide Voice model and Speed. Show Expression with Steady, Natural, and Expressive. Each preset sends its Eleven v3 stability. Custom does not show, because the three presets are the three modes.
10. **Measure.** Record the time to the first sound for five sentences on each ElevenLabs path. Write the numbers in the notes file.
11. **Docs.** Update `docs/concepts/streaming-voice.md`, `docs/concepts/voice-expression.md`, `docs/concepts/desktop-providers.md`, `apps/web/README.md`, `apps/desktop/README.md`, and `apps/desktop/src-tauri/README.md`.

## Part 2: Audio Tags

### Where Tags Go

`tagsSpoken(settings)` is true for the Dialogue service, and for the ElevenLabs service with `eleven_v3`. It is false for all other voices.

| Path | Tags spoken | Tags not spoken |
| --- | --- | --- |
| Speak, the speak key of a row, replay | Kept | Removed |
| Fallback to the system voice | Removed | Removed |
| Read aloud and Present (through `speak()`) | Kept | Removed |
| Video and audio export | Kept | Removed |
| Mood block in the suggestion prompt | Tone and tag rules | Tone only |
| Word row | Words and tag tiles | Words only |
| Captions | `alignmentToWords` already skips tags. | Same |
| Word engine and history rows | Tags are tokens. | Same |
| Slice word count and phrase codes | Tags do not count. | Same |
| Transcript, phrase rows, and suggestion rows | Tags show as chips. | Same |

### Moods

Five moods, from the mock. The mood is saved for each space as `talk-mood:<spaceId>`, beside the draft. It stays until the user presses the key again.

| Key | Mood | Instructions | Example tags |
| --- | --- | --- | --- |
| 😊 | Warm | The user feels warm. Write the suggestions in a kind, warm tone. | warmly, happy, chuckles |
| 😄 | Playful | The user feels playful. Write the suggestions in a playful tone. Light jokes are good. | laughs, giggles, mischievously, sarcastic |
| 😔 | Low | The user feels low or tired. Write short, quiet suggestions. Do not try to change the mood of the user. | sighs, sad, exhales |
| 😤 | Frustrated | The user feels frustrated. Write direct suggestions. Keep them clear, not rude. | annoyed, frustrated sigh, exhales sharply |
| 😠 | Angry | The user feels angry. Write firm, strong suggestions. Do not use insults or swear words. | angry, shouting, firmly |

With no mood, the prompt has no mood block. The example tags are then laughs, sighs, whispers, excited, and curious.

When tags are spoken, `OPENING_PROMPT` and `COMPLETION_PROMPT` get these rules:

```
You can add audio tags in square brackets, such as [laughs] or [whispers].
Choose any tag that fits the words. The tags in the mood block are examples only.
A tag must describe the voice. Do not use tags for music or sound effects.
Put a tag just before or just after the words that it changes.
Give a tag only to a suggestion that needs one.
Do not change the words that the user typed.
```

The model can write any tag. The app does not filter tags.

### Steps

1. **Tag rules** (`packages/core/rules/audio-tags.ts`). Add `isTag(token)`, `stripTags(text)`, `tagsSpoken(settings)`, and `speakableText(text, settings)`. Write the tests first.
2. **Speech paths.** `speak()` sends `speakableText`. The fallback in `cloudVoice` and `dialogueVoice` sends `stripTags`. `synthesizeSpeech` and `synthesizeTimed` send `speakableText`. When the service is Dialogue, export sends `eleven_v3` to the TTS endpoint. The export video needs MP3, and that endpoint gives it.
3. **Moods** (`packages/core/rules/moods.ts`). Add the table above and `moodBlock(mood, tagsOn)`. Write the tests first.
4. **Prompts** (`packages/core/rules/prompts.ts`). `buildSuggestionPrompt` takes `mood` and `tagsOn`. It adds the mood block to `<user_context>`, after the speaking style, and adds the tag rules when `tagsOn` is true. `useCompletions` puts the mood in its request key, so a new mood sends a new request at once.
5. **Rows** (`packages/core/rules/stripes.ts`).
   - A tag is one token.
   - The prefix match compares the text without tags.
   - A tag tile does not count toward the six words of a slice.
   - A press on a tile takes the words and the tags up to that tile. A tag before the typed words goes to the start of the draft.
6. **Word engine** (`packages/core/autocomplete/tokenizer.ts`). The tokenizer keeps `[...]` as one token, so the engine learns tags from sent messages. The word row shows up to two tag tiles after the words. Engine tags come first, then the example tags of the mood. The tiles show only when `tagsSpoken` is true.
7. **Mood keys** (`packages/app-ui/blocks/space.tsx`). Put five toggle buttons in the composer toolbar, left of the audio output select. Each button is 44 by 44 pixels, with `aria-pressed` and the label "Mood: Warm" and so on. The keys show for every voice, because the mood also changes the wording.
8. **Chips.** Suggestion rows, the word row, transcript bubbles, and phrase rows show each tag as a chip.
9. **Composer tags** (`packages/app-ui/blocks/space.tsx`). The composer shows each tag in the draft as a chip.
   - A highlight layer sits behind the `textarea`. It has the same font, padding, and line wrap. It draws a chip background behind each tag. The textarea stays on top and keeps the caret, the selection, and screen reader behavior.
   - The chip background does not change the width of the text. Thus the layer and the textarea always agree on the line breaks.
   - Backspace directly after a tag removes the complete tag. "Delete last word" also removes one tag as one word.
   - The draft stays one string, with each tag in square brackets.
10. **Phrases.** `generateCode` reads the text without tags. When tags are spoken, `PHRASES_SYSTEM_PROMPT` can add a tag to a phrase with a clear feeling. The phrase prompt does not get the mood.
11. **Docs.** Add `docs/concepts/audio-tags.md`. Update `docs/concepts/saved-phrases.md`, `docs/concepts/writing-model-settings.md`, and the READMEs of `packages/core`, `packages/app-ui`, `apps/web`, and `apps/desktop`.

## Tests

Each step starts with a failing test at a public boundary:

- Core rules: `dialogueParts`, `stripTags`, `speakableText`, `moodBlock`, the prompt text with and without tags, and row slices with tags.
- Web: `speech-stream.test.ts` gets a fake fetch stream. The tests cover a split sample, a line split across two chunks, the timeout, a failure after the first sound, and stop.
- Desktop: `tests/providers.rs` gets a fake HTTP server for the dialogue stream. The tests cover the same cases.
- Screens: the Dialogue service choice, the hidden Speed and Voice model, a mood key press that changes the request, a tag tile press that changes the draft, and Backspace after a tag in the composer.
- Negative: the system voice never receives a tag. The fallback voice never receives a tag.

## Open Questions

1. **Speed.** The dialogue endpoint has no speed field. Options: hide Speed for Dialogue (this plan), or add a speed tag such as `[slowly]`. A tag is not exact, so this plan hides Speed.
2. **Mood reset.** Must the mood clear after some time with no messages? This plan keeps it until the user changes it.
3. **Default service.** Dialogue stays a choice. It does not replace ElevenLabs as the default, because it starts to speak later.

## Addendum: Eleven v3 Conversational

Added on 2026-09-25 at the request of the user.

The Dialogue voice gets a second model, `eleven_v3_conversational`. ElevenLabs documents this model only with the Text to Dialogue WebSocket, so this model uses that socket. `eleven_v3` keeps the HTTP stream.

| | Eleven v3 | Eleven v3 Conversational |
| --- | --- | --- |
| Transport | `POST /v1/text-to-dialogue/stream/with-timestamps` | `wss://…/v1/text-to-dialogue/stream-input` |
| First message | Not applicable | `{ "voices": [voiceId], "voice_settings": { "stability" }, "xi_api_key" }` |
| Text | One request for each part | One `{ "inputs": [{ "text", "voice_id" }] }` frame for each part, then `{ "close_socket": true }` |
| End | The stream ends | `{ "is_final": true }` |

- The new optional field `dialogueModelId` of the `speech` setting holds the model. Without it, the model is `eleven_v3`. The saved `modelId` of the ElevenLabs service does not change.
- The Voice tab of the Dialogue voice shows Voice model with the two models.
- The cache name and the usage record include the model.
- Exports keep `eleven_v3` on the text-to-speech endpoint, because an export needs an MP3 file.
- The default stays `eleven_v3` until the time to the first sound is measured for both models.
