# Streaming Cloud Voice

Status: Implemented. The FaceTime check and the time-to-first-sound measurement are pending. See the notes.

## Scope

Speak in the web and desktop apps will stream the ElevenLabs voice through the text-to-speech WebSocket.
The first sound will play while ElevenLabs still makes the rest of the sentence. Today each app waits for the full MP3 file.

This plan changes Speak only. Note export, video export, voice previews, and the system voice keep their current paths.
The macOS keyboard is outside this plan.

## Transport Choice

For a sentence that is known in advance, the HTTP `/stream` endpoint gives about the same time to first sound.
This plan uses the WebSocket because the same connection accepts text in parts.
A later plan can then speak AI Assistance text while the model writes it, without a second transport.
This plan does not build that feature.

## Protocol

Both apps use the same messages:

| Step | Direction | Message |
| --- | --- | --- |
| Connect | App to ElevenLabs | `wss://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream-input?model_id={modelId}&output_format=pcm_24000` |
| Open | App to ElevenLabs | `{ "text": " ", "voice_settings": { "stability", "similarity_boost", "speed" }, "xi_api_key": "<key>" }` |
| Text | App to ElevenLabs | `{ "text": "<sentence> ", "flush": true }` |
| Close | App to ElevenLabs | `{ "text": "" }` |
| Audio | ElevenLabs to app | `{ "audio": "<base64>", "alignment": { ... } }` |
| End | ElevenLabs to app | `{ "isFinal": true }` |

The `pcm_24000` format gives 16-bit signed little-endian mono samples at 24 kHz. The apps play these samples without a decoder.
A chunk can end in the middle of a sample. Each app keeps the odd byte and puts it before the next chunk.

The endpoint does not accept `eleven_v3`. For that model, both apps keep the current file path.

## Failure and Stop Behavior

| Event | Result |
| --- | --- |
| The socket fails before the first audio chunk | The system voice speaks the sentence. The current fallback notice appears. |
| No audio chunk arrives within 5 seconds | Same as a failure before the first chunk. The app closes the socket. |
| The socket fails after the first audio chunk | The sound stops, and the current "Speech could not play" notice appears. |
| The user presses Stop, or Speak starts a new sentence | The app closes the socket and stops the scheduled sound. |

After a failure in the middle of a sentence, the system voice does not start again.
The listener already heard the first part of the sentence. A second voice repeats that part.

Usage records keep their current fields. The `latency_ms` value becomes the time to the first audio chunk.

## Cache

The apps write the cache only after `isFinal` arrives. A stopped or failed sentence writes nothing.
The cache file is a WAV file: the PCM samples after a 44-byte header.

| App | Cache name |
| --- | --- |
| Web | `${speechBlobId}:pcm` in the current bounded blob store |
| Desktop | The current SHA-256 file name with `.wav`, in the current audio folder |

A lookup tries the WAV name first. Then it tries the MP3 name that the file path wrote, so old entries do not cost credits again.
A cache hit plays the stored file through the current file player: `playSpeechFile` on web, `speech_file_play` on desktop.
Exports keep their MP3 cache and do not read the WAV entries.

## Web App

The web app already keeps the ElevenLabs key in the browser, so the browser opens the socket.

In `apps/web/src/services/os.ts`, a new function `streamSpeech(text, settings, signal)` does these steps:

1. It looks up the cache.
2. It opens the socket and sends the messages in the protocol table.
3. It converts each chunk to `Float32` samples in an `AudioBuffer`.
4. It schedules each buffer on one `AudioContext` at 24 kHz, directly after the buffer before it.
5. It resolves `{ from_cache }` when the last buffer ends.

If the browser supports `AudioContext.setSinkId`, the function sends the sound to the selected output. Otherwise the sound uses the default output.
`stopNativeSpeech` also closes the socket and the `AudioContext`.

In `apps/web/src/services/speech.ts`, `cloudVoice` calls `streamSpeech` in place of `synthesizeSpeech` and `playSpeechFile`.

## Desktop App

The key never enters the WebView, so a socket in React is not permitted.
The virtual microphone hears only the native `AVAudioEngine`. Sound that plays in the WebView does not reach a call.
For these reasons, Rust owns the socket and native code owns the playback.

Rust changes:

- Add `tokio-tungstenite` with rustls, and `futures-util`.
- Add `Providers::speak_stream(key, settings, text, on_samples)` in `providers.rs`. It derives the socket address from the `eleven_labs` base, so `Providers::with_bases` works in tests.
- Add `speech::stream` in `speech.rs`. It looks up the cache, sends the samples to native code, and writes a `.part` file. After `isFinal`, it renames the file to `.wav`.
- Add a `speech_stream` command in `rpc.rs` and register it in `lib.rs`. It returns `{ from_cache }` when the sound stops.
- Keep the abort handle of the running stream in `BackendState`. `speech_native_stop` also cancels the stream.

Native changes in `native/audio.m`:

- `september_speech_stream_begin(sample_rate, output_uid, error, capacity)` makes the speech engine on the selected output with `CreateSpeechEngine`.
- `september_speech_stream_append(samples, count)` converts the samples to a float `AVAudioPCMBuffer` and calls `scheduleBuffer` on the speech node.
- `september_speech_stream_finish(error, capacity)` blocks until the last buffer plays.
- The stream uses the current speech engine and node, so `september_speech_stop`, the output routing, and the process tap work without changes.

React changes: `apps/desktop/src/services/os.ts` adds a `streamSpeech` call to `speech_stream`. The `cloudVoice` function in `apps/desktop/src/services/speech.ts` uses it.

## Implementation Sequence

1. In `tests/providers.rs`, write failing tests against a local `tokio-tungstenite` server. Cover the open message, the text and close messages, the sample order, a split sample, and a rejected key.
2. Implement `Providers::speak_stream`.
3. In `speech.rs`, write failing tests for a complete stream, an interrupted stream, a WAV cache hit, and an MP3 cache hit.
4. Implement `speech::stream`.
5. Add the native stream functions and the `speech_stream` command.
6. In `apps/web/src/services/speech.test.ts`, write failing tests with a fake `WebSocket` and a fake `AudioContext`. Cover each row of the failure table, the cache rules, and the resolve after the last buffer.
7. Implement `streamSpeech` in the web app and change `cloudVoice`.
8. Change the desktop `cloudVoice` to call `speech_stream`.
9. Add `docs/concepts/streaming-voice.md`. Update `desktop-providers.md`, `desktop-virtual-microphone.md`, and the web and desktop READMEs.

Before each implementation step, run the new tests and see them fail.
Record deviations in `docs/notes/2026-09-25-streaming-voice.md`, with a frontmatter link to this plan.

## Validation

1. Run the web tests, lint, and build.
2. Run `cargo test` and the desktop build.
3. On desktop, turn on the virtual microphone and speak a cloud-voice sentence into a FaceTime call. The other side must hear the sentence.
4. On both apps, measure the time to first sound for a 20-word sentence with the file path and with the stream.
