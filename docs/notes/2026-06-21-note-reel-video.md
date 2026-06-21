---
title: Note Reel Video — Implementation Notes
plan: ../research/2026-06-21-note-reel-video.md
---

# Implementation notes

Records decisions where the research left choices open, deviations, and reviewer-relevant context.

## Decisions / resolutions

- **Renderer is FFmpeg plus `sharp` for MVP.** The research recommended Remotion for richer
  React-rendered visuals, but the first shipped slice rasterizes SVG caption frames with `sharp`
  and encodes those PNG frames with FFmpeg. This keeps the change smaller, avoids a
  video-rendering framework and license decision, and still produces a real 1080x1920 MP4.

- **TTS stays browser-side.** The app uses the existing ElevenLabs speech provider, so the user's API
  key remains in the local account path. The server render receives only audio data, caption timing,
  and duration.

- **ElevenLabs-only guard.** Export is disabled unless the selected speech provider is ElevenLabs.
  Other providers can still play or download audio, but they do not provide the character timing
  needed for synced captions.

- **No persistent server storage.** The renderer writes temporary audio, PNG frame, and MP4 files,
  then removes the temp directory after returning a base64 MP4 to the browser.

## Verification status

- `pnpm test` passes: 54 files, 471 tests.
- `pnpm lint` passes with existing warnings.
- `pnpm build` passes.
- Local FFmpeg smoke rendered a tiny PNG-frame MP4 successfully.
