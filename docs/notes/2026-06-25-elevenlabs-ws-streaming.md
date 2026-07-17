---
title: ElevenLabs WebSocket streaming TTS — implementation notes
plan: ~/.claude/plans/tranquil-dreaming-papert.md
---

Records only what differs from the plan or needs reviewer attention.

## Deviations from the plan

- **Live player owned by the hook, not `use-create-audio-message`.** The plan put
  the `PcmStreamPlayer` in the consumer. Moved it into `useSpeech.generateSpeechStream`
  because that's the only place that knows the PCM sample rate
  (`output_format`). The hook creates the player, feeds `onAudioChunk`, calls
  `end()` on success and `stop()` on failure. The consumer just awaits a
  `SpeechResponse` and never touches audio.

- **Connection is a module singleton, not a context-scoped instance.** The plan
  surfaced the manager via `SpeechProvider` context with unmount disposal.
  Several components call `useSpeech` independently (create/play message,
  slide voice-over, settings); a per-hook instance would open multiple idle
  warm sockets. A module-level `ElevenLabsWsConnection` singleton
  (`getWsConnection()`) is shared across all instances and lives for the app
  lifetime. Focus/visibility listeners are registered once.

- **Fallback extracted to a pure helper.** `synthesizeWithFallback` in
  `spaces/lib/` holds the stream→REST decision so it's unit-tested without a
  React hook harness (the repo has no `@testing-library/react`/`renderHook`).

## To verify against the real API

- **Alignment offset.** `mergeStreamAlignment` assumes stream-input
  `charStartTimesMs` are **chunk-relative** and offsets each chunk by cumulative
  audio duration. If a model version returns stream-cumulative timestamps, the
  offset double-counts — check captions line up on a multi-chunk utterance and
  drop the offset if so.
- **`previous_text` in BOS.** Forwarded in the BOS body for prosodic continuity;
  confirm stream-input accepts it (ignored harmlessly if not).

## Notes

- Stored/broadcast blob is **WAV** (from PCM), larger than the old MP3. Replay
  and the display popup play it via the existing `data:` URI `<audio>` path.
- New files: `audio/lib/pcm-to-wav.ts`, `audio/lib/pcm-stream-player.ts`,
  `speech/lib/providers/elevenlabs-stream.ts`,
  `speech/lib/providers/elevenlabs-ws-connection.ts`,
  `spaces/lib/synthesize-with-fallback.ts` (+ tests).
