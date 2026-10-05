---
title: Streaming voice
description: The ElevenLabs voice plays an MP3 file from HTTP. The Dialogue voice plays while ElevenLabs makes the rest of the sentence, through the Text to Dialogue stream or socket.
package: core, desktop, web
---

# Streaming voice

Speak in both apps sends an ElevenLabs sentence to the HTTP text-to-speech
endpoint. The endpoint returns one MP3 file, and the app plays the file. The
Dialogue voice streams its sound. The first sound plays before ElevenLabs
finishes the sentence. See [the Dialogue voice](#the-dialogue-voice).

## The ElevenLabs voice

Both apps send one request for each sentence:

```
POST /v1/text-to-speech/{voiceId}
xi-api-key: <key>

{ "text": "<sentence>", "model_id": "<modelId>",
  "voice_settings": { "stability": ..., "similarity_boost": ..., "speed": ... } }
```

The MP3 file goes into the speech cache under a SHA-256 name of the text and
the settings. A kept file plays again without a request. Exports use the same
file.

| App     | Request          | Playback                                                     |
| ------- | ---------------- | ------------------------------------------------------------ |
| Web     | The browser      | An `Audio` element, on the chosen output when the browser has `setSinkId` |
| Desktop | Rust             | The native `AVAudioEngine`, which opens the file as an `AVAudioFile` |

On desktop, the virtual microphone hears only the native engine. Sound from
the WebView does not reach a call, so the native engine plays the file. See
[virtual microphone](desktop-virtual-microphone.md).

If the request fails, or the file does not arrive in 15 seconds, the system
voice speaks the sentence, and a notice says so. A stop, or a new sentence,
stops the file. On desktop, a stop also keeps a file silent that was about to
play. If the output changes in the middle of a file, the sound stops, and the
"Speech could not play" notice appears. A stopped sentence gives no usage
record.

## The stream players

The Dialogue voice sends 16-bit signed little-endian mono samples at 24 kHz, so
no decoder is necessary. A chunk can end inside a sample. The app keeps the odd
byte and puts it before the next chunk.

| App     | Playback                                                         |
| ------- | ---------------------------------------------------------------- |
| Web     | One `AudioContext` at 24 kHz, each chunk after the one before it |
| Desktop | The native `AVAudioEngine`, through `scheduleBuffer`             |

The web app sends the stream to the chosen output with
`AudioContext.setSinkId` when the browser has it. Other browsers use the
default output.

## When the stream fails

| Event                                      | Result                                                  |
| ------------------------------------------ | ------------------------------------------------------- |
| The stream fails before the first sound    | The system voice speaks the sentence, and a notice says so. |
| No sound arrives in time                   | Same as a failure before the first sound.               |
| The stream fails after the first sound     | The sound stops, and the "Speech could not play" notice appears. |
| Stop, or a new sentence                    | The app closes the stream and stops the sound.          |

After a failure in the middle of a sentence, the system voice does not start.
The listener heard the first part already, and a second voice says it again.
Both apps report this case as `InterruptedSpeech`.

## The kept sentence

A complete Dialogue sentence is kept as a WAV file: the samples after a 44-byte
header. A stopped or broken sentence keeps nothing.

| App     | Name                                                            |
| ------- | --------------------------------------------------------------- |
| Web     | `dialogue:<sha256>:pcm` in the bounded speech cache of IndexedDB |
| Desktop | `audio/<sha256>.wav`, beside the MP3 files                      |

A kept sentence plays as a file and sends no request. Exports keep their MP3
files and do not read the WAV files.

The usage record of a streamed sentence gives the time to the first sound as
`latency_ms`.

## The Dialogue voice

The `dialogue` voice service is ElevenLabs Dialogue. It has two models, and
both keep the audio tags of a sentence. The `dialogueModelId` field of the
`speech` setting holds the model. Without it, the model is `eleven_v3`.

| Model | Transport |
| --- | --- |
| `eleven_v3` | The HTTP stream below |
| `eleven_v3_conversational` | The dialogue socket below. ElevenLabs serves this model only there. |

For `eleven_v3`, both apps send one HTTP request for each part of the
sentence:

```
POST /v1/text-to-dialogue/stream/with-timestamps?output_format=pcm_24000
xi-api-key: <key>

{ "inputs": [{ "text": "<part>", "voice_id": "<voiceId>" }],
  "model_id": "eleven_v3",
  "settings": { "stability": <0 | 0.5 | 1> } }
```

The answer is a stream of JSON objects, and each object holds
`audio_base64`. The apps read one complete object after the other. A line break
between two objects is optional, and one object can arrive in pieces. The
stream players play the sound.

| Rule                  | Value                                                               |
| --------------------- | ------------------------------------------------------------------- |
| Stability             | The nearest Eleven v3 mode: 1.0, 0.5, or 0.0                        |
| Similarity and speed  | Not sent. The endpoint has no speed field.                          |
| Text in one request   | At most 2,000 characters. `dialogueParts` cuts a longer text at sentence ends, and the parts play one after the other. |
| Time to the first sound | 10 seconds, because Eleven v3 starts later than Flash             |
| A 401 or 403 answer   | The key is wrong. The notice says so.                               |

For `eleven_v3_conversational`, both apps open one socket for the sentence:

| Step    | Direction         | Message |
| ------- | ----------------- | ------- |
| Connect | App to ElevenLabs | `/v1/text-to-dialogue/stream-input?model_id=eleven_v3_conversational&output_format=pcm_24000` |
| Open    | App to ElevenLabs | `{ "voices": ["<voiceId>"], "voice_settings": { "stability": <0 \| 0.5 \| 1> } }` |
| Text    | App to ElevenLabs | `{ "inputs": [{ "text": "<part>", "voice_id": "<voiceId>" }] }`, one for each part |
| Close   | App to ElevenLabs | `{ "close_socket": true }` |
| Audio   | ElevenLabs to app | `{ "audio": "<base64>" }` |
| End     | ElevenLabs to app | `{ "is_final": true }` |

The web app sends the key as `xi_api_key` in the open message, because a
browser cannot set a header on a WebSocket. The desktop app sends it in the
`xi-api-key` header from Rust, so the key never enters the WebView. A bad key
does not fail the handshake. ElevenLabs accepts the socket and sends the reason
as a message, so the app shows that reason.

The hash of a kept Dialogue sentence covers the text, the
voice, the stability, and the Dialogue model. The desktop file name holds the
provider and the Dialogue model. Exports use `eleven_v3` for both models,
because an export needs an MP3 file from the text-to-speech endpoint.
