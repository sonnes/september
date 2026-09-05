---
title: Present and export a note
description: A note fills the screen one chunk at a time, spoken in the user's voice, and saves as text, audio, or a captioned video.
package: core, app-ui, desktop, web
---

# Present and export a note

A note holds prepared long-form text (`space-notes.md`). It leaves the editor
two ways, on both apps:

- **Present** — the note fills the whole screen, one chunk at a time, spoken in
  the user's voice. Live communication, not a file.
- **Export** — the note saves as **Text** (`.md`), **Audio** (`.mp3`), or
  **Video** (a 9:16 `.mp4` with word-synced captions).

One name for each thing: Present, Export, Text, Audio, Video. The tones are
Indigo, Ink, Paper, Cream, Sage, Blush, and Sky.

## The stage

Present is an overlay, not a route, so the address of the app stays on the note
the user is holding and the frozen route sets do not move.

`presentChunks` in `packages/core/rules/present.ts` cuts the note:

1. A line of only dashes or stars ends a section, as it did in the old slides.
2. A heading and each row of a list stand alone; a paragraph splits into
   sentences.
3. A sentence longer than 140 characters splits where the writer paused, and
   between words when there is no pause in it.

A chunk is **display** when it is a heading or the first words of a section,
and **support** otherwise. The markup never reaches the stage, the same way it
never reaches the voice.

`chunkFontRatio` gives the font size as a share of the stage width, from the
length of the chunk and the shape of the stage. The live stage is full-bleed:
a Mac or an iPad faces the room in landscape, and locking a phone shape would
waste most of the screen. The 9:16 frame is the shape of the exported video
only.

## Two modes

- **Spoken** — each chunk is spoken through `speak()`, and the next chunk rises
  when the sound stops. This rests on one service contract: *`speak()` resolves
  when playback ends, not when it starts.*
- **Silent** — no audio at all. The presenter advances, and the partner reads.
  This works with nothing configured, which is why Present needs no setup.

A speaker switch in the chrome changes mode mid-story. Thirds of the stage move
back, hold, and on; the keys are `←` `→` `Space` `Home` `End` `Esc`.

## Tones

Seven tones in one picker, in two families:

| Family | Tones | Display face |
| --- | --- | --- |
| Keycap | Indigo (default), Ink, Paper | Noto Sans 700 |
| Reading | Cream, Sage, Blush, Sky | Fraunces 550 |

The serif is fetched only when a paper tint is chosen. Keycap tones sign the
corner with the September mark, paper tints with the wordmark. The same tone
skins the stage and the exported video. The choice is remembered in the
`present` setting, with the spoken or silent mode.

## Presenting into a call (desktop)

September Microphone captures native speech playback, so a callee hears a
presented note when the user enables the microphone in Talk.

## Export

| Row | File | Needs |
| --- | --- | --- |
| Text | `<note-slug>.md` | nothing |
| Audio | `<note-slug>.mp3` | an ElevenLabs voice |
| Video | `<note-slug>.mp4` | an ElevenLabs voice, in the browser app |

`exportReason` says why a row cannot run yet, in the place of its own
description. A row that cannot run keeps its target and its place; a row that
disappears teaches the user nothing.

The words always save. A note is the user's own writing, and no service stands
between them and a copy of it.

**Audio** reuses the speech cache, so a note read aloud a moment earlier saves
without asking the service again.

**Video** is rendered in the browser app. `synthesizeTimed` asks ElevenLabs for
the sound and the character alignment together; `alignmentToWords` and
`wordsToCaptions` cut that into captions of up to six words, and
`apps/web/src/services/video.ts` draws one 1080×1920 frame for each word and
joins them to the voice with `ffmpeg.wasm`. Nothing leaves the machine.

The Mac app names the browser instead of hiding the row: `ffmpeg.wasm` reaches
its core through a blob URL, and the script policy of that window allows
`'self'` only.

## What is counted

A presentation records `note_present` and an export records `note_export` in
the existing analytics store. Neither is a provider call, so neither reaches
the spend report.

## Speech failure

Present advances only after successful speech. Stop invalidates pending cloud
audio so it cannot play later. On speech failure, Present pauses on the unread
chunk and shows a retry message. The user can restart the voice or read the
words on screen. Read aloud shows failures without adding transcript rows.
