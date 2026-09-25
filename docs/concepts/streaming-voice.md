---
title: Streaming voice
description: Speak plays the ElevenLabs voice while ElevenLabs makes the rest of the sentence, through its text-to-speech WebSocket.
package: desktop, web
---

# Streaming voice

Speak in both apps sends a cloud-voice sentence through the ElevenLabs
text-to-speech WebSocket. The first sound plays before ElevenLabs finishes the
sentence. The system voice, voice previews, and note exports do not use the
socket.

## The socket

Both apps send the same messages:

| Step    | Direction         | Message                                                           |
| ------- | ----------------- | ----------------------------------------------------------------- |
| Connect | App to ElevenLabs | `/v1/text-to-speech/{voiceId}/stream-input?model_id={modelId}&output_format=pcm_24000` |
| Open    | App to ElevenLabs | `{ "text": " ", "voice_settings": { ... } }`                      |
| Text    | App to ElevenLabs | `{ "text": "<sentence> ", "flush": true }`                        |
| Close   | App to ElevenLabs | `{ "text": "" }`                                                  |
| Audio   | ElevenLabs to app | `{ "audio": "<base64>" }`                                         |
| End     | ElevenLabs to app | `{ "isFinal": true }`                                             |

The sound is 16-bit signed little-endian mono at 24 kHz, so no decoder is
necessary. A chunk can end inside a sample. The app keeps the odd byte and
puts it before the next chunk.

The web app sends the key as `xi_api_key` in the open message, because a
browser cannot set a header on a WebSocket. The desktop app sends the key in
the `xi-api-key` header from Rust, so the key never enters the WebView.

The endpoint does not accept `eleven_v3`. For that model, both apps make an
MP3 file with the HTTP endpoint and play the file.

## Where the sound plays

| App     | Socket             | Playback                                                       |
| ------- | ------------------ | -------------------------------------------------------------- |
| Web     | The browser        | One `AudioContext` at 24 kHz, each chunk after the one before it |
| Desktop | Rust, in `speech_stream` | The native `AVAudioEngine`, through `scheduleBuffer`     |

On desktop, the virtual microphone hears only the native engine. Sound from
the WebView does not reach a call, so the native engine plays the stream.
See [virtual microphone](desktop-virtual-microphone.md).

The web app sends the stream to the chosen output with
`AudioContext.setSinkId` when the browser has it. Other browsers use the
default output.

## When the voice fails

| Event                                      | Result                                                  |
| ------------------------------------------ | ------------------------------------------------------- |
| The socket fails before the first sound    | The system voice speaks the sentence, and a notice says so. |
| No sound arrives within 5 seconds          | Same as a failure before the first sound.               |
| The socket fails after the first sound     | The sound stops, and the "Speech could not play" notice appears. |
| Stop, or a new sentence                    | The app closes the socket and stops the sound.          |

After a failure in the middle of a sentence, the system voice does not start.
The listener heard the first part already, and a second voice says it again.
Both apps report this case as `InterruptedSpeech`.

A bad key does not fail the handshake. ElevenLabs accepts the socket and sends
`Invalid API key` as a message, so the app shows that reason.

## The kept sentence

A complete sentence is kept as a WAV file: the samples after a 44-byte header.
A stopped or broken sentence keeps nothing.

| App     | Name                                                            |
| ------- | --------------------------------------------------------------- |
| Web     | `speech:<sha256>:pcm` in the bounded speech cache of IndexedDB  |
| Desktop | `audio/<sha256>.wav`, beside the MP3 files                      |

A lookup tries the WAV name, then the MP3 name that the file path wrote. A
kept sentence plays as a file and opens no socket. Exports keep their MP3
files and do not read the WAV files.

The usage record of a streamed sentence gives the time to the first sound as
`latency_ms`.
