---
plan: ../plans/2026-09-25-streaming-voice.md
---

# Streaming Voice Implementation Notes

- The desktop app sends the key in the `xi-api-key` handshake header, not as `xi_api_key` in the open message. ElevenLabs documents both. The header keeps the key out of message bodies. The web app sends `xi_api_key`, because a browser cannot set a WebSocket header.
- A bad key does not fail the handshake. ElevenLabs accepts the socket and sends `Invalid API key` as a message. A handshake 401 or 403 still maps to `ProviderError::Rejected`.
- On desktop, `speech_stream` plays a kept file itself. The `speech_file_play` command and the desktop `playSpeechFile` export had no other caller, so they were removed. The WebView no longer sends a file path for native playback.
- Rust holds the samples of a sentence in memory and writes the WAV file after `isFinal`. It writes a `.part` file and then renames it. It does not write the file while the chunks arrive.
- Each native stream has a number. A late `append` or `finish` from a cancelled task carries an old number and does nothing. Without the number, a late `finish` can end a newer sentence early.
- `speech::synthesize` takes `&Providers`, so a test can point the `eleven_v3` file path at loopback.
- `base64` moved from the macOS-only dependencies to the main list, because `providers.rs` decodes the audio chunks.
- The desktop `streamSpeech` wrapper has no JavaScript test. Desktop `os.ts` runs Tauri calls at the top level, so node cannot import it. The shared `speech.test.ts` runs the `speech.ts` contract of both apps.
- A parallel change made `eleven_flash_v2_5` the default model and added a `@september/core/rules/voice` import to both `speech.ts` files. The require shim of `speech.test.ts` supplies that module.

## Validation

- Web: `pnpm test` (257 tests), `pnpm lint`, and `pnpm build` pass.
- Desktop: `pnpm test` (52 tests) and `pnpm build` pass. `cargo clippy` and `cargo fmt --check` pass.
- `cargo test`: all suites pass except `tests/virtual_microphone.rs`. That test also fails on a clean `HEAD` checkout on this machine, with `avfaudio error -10875`.
- A test binary cannot play native sound on this machine. The file player that existed before this change fails the same way, with "player did not see an IO cycle". The native stream functions, the FaceTime check, and the time to first sound still need a run of the desktop app.
- A live socket with a bad key returned `Invalid API key` through rustls. This check confirmed TLS and the endpoint address.
