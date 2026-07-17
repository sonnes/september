---
title: Note Reel Video — Implementation Notes
plan: ../research/2026-06-21-note-reel-video.md
---

# Implementation notes

Records decisions where the research left choices open, deviations, and reviewer-relevant context.

## Decisions / resolutions

- **Renderer switched to `ffmpeg.wasm`.** The native FFmpeg + `sharp` checkpoint was committed as
  `9cbad5f`, then the working tree moved to browser-only rendering. The current slice rasterizes
  caption frames with Canvas and muxes those PNG frames with the generated audio in `ffmpeg.wasm`.
  This keeps note text and generated audio in the browser during export.

- **TTS stays browser-side.** The app uses the existing ElevenLabs speech provider, so the user's API
  key remains in the local account path. The export no longer calls a server render function.

- **ElevenLabs-only guard.** Export is disabled unless the selected speech provider is ElevenLabs.
  Other providers can still play or download audio, but they do not provide the character timing
  needed for synced captions.

- **Export UI is inline.** The first UI used a dialog, but the flow now expands inside the selected
  note card. This keeps the note list context visible during slow browser-side rendering and avoids
  a modal focus trap for a task that behaves more like a tool panel.

- **Wasm core loads lazily.** `@ffmpeg/ffmpeg` and `@ffmpeg/util` load only when the user exports a
  reel. The core files are fetched through `toBlobURL` from jsDelivr for this prototype pass.

- **No persistent server storage.** The renderer writes audio, PNG frame, and MP4 files only into
  `ffmpeg.wasm`'s in-browser virtual filesystem, then deletes them after creating the download blob.

## Verification status

- `pnpm test` passes: 54 files, 470 tests.
- `pnpm lint` passes with existing warnings.
- `pnpm build` passes.
