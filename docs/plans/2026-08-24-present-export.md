---
title: Present and export a note
description: A full-screen spoken story view and a three-artifact export dialog replace the retired reel feature, on both the desktop and web apps.
status: implemented
mock: ../mocks/2026-08-24-present-export.html
look: ../mocks/2026-08-24-present-look-options.html
notes: ../notes/2026-08-24-present-export.md
---

> Implemented 2026-08-24. The code placement below predates the workspace
> refactor (`8f1a431`); the rules landed in `packages/core/rules/present.ts`
> and the stage in `packages/app-ui/blocks/present.tsx`, with only the export
> service and the timed synthesis per app. See the notes for the rest of the
> deviations.

# Present and export a note

Notes hold prepared long-form text (`docs/concepts/space-notes.md`). Today a
note can only be read aloud in place. This design gives a note two ways out of
the editor, on both apps:

- **Present** — a full-screen story view. The note fills the screen one chunk
  at a time in the editorial look, spoken by the user's voice, for a person in
  the room or a call audience. This is live communication, not a file.
- **Export** — a dialog that saves the note as a file: **Text** (`.md`),
  **Audio** (`.mp3`), or **Video** (a 9:16 story `.mp4`).

Together they replace everything the retired reel feature did — the story
player, the MP4 exporter, the voice-over download, and the `/present/$id`
slides route — under two plain verbs instead of a borrowed social-media noun.
The old code is recoverable (`git show HEAD:apps/web/src/packages/notes/...`
on the web branch); the chunking rules and the canvas renderer are ported,
not reinvented. The look is new (see below) — the old editorial reel theme
is retired with the name.

## Why now

- The desktop notes plan deferred this exact work: *"Add when a user presents
  from the Mac"* (`docs/plans/2026-08-21-desktop-notes.md`).
- The desktop Tauri capabilities already allowlist `present-*` and `display-*`
  window labels that nothing uses.
- The web rewrite (`2026-08-24-web-desktop-ui.md`) deleted the reel surface,
  but the landing page still markets it (`components/home/reels-section.tsx`).

## Naming (copy contract)

One name per concept, enforced by `copy.test.mjs` / `copy-contract.test.ts`:

| Concept | Name | Never |
| --- | --- | --- |
| The live full-screen view | **Present** | Reel, Story player, Slides |
| The file dialog | **Export** | Share, Download (as a feature name) |
| The artifacts | **Text**, **Audio**, **Video** | Voice-over file, Reel |
| The tone choices | Indigo, Ink, Paper, Cream, Sage, Blush, Sky | the old pair names (Stone…) |

"Reel" is retired everywhere, including the web landing page.

## Entry points

The note editor header (both apps) grows from two actions to four:

```
[ Voice-over ▸ ]  [ Present ▶ ]  [ Export ⇩ ]        [ Delete 🗑 ]
```

- **Voice-over** stays: speak the note in place while the editor is visible.
- **Present** (primary pill, `size="lg"`, `rounded-full`) opens the overlay.
- **Export** (outline pill) opens the export dialog.
- All targets ≥44px effective; unavailable states use `aria-disabled` with a
  reason, never `disabled`.

The console (composer) is unchanged — no new mode, no new console. The right
panel rail is unchanged — Present is a per-note action, not a composing aid,
so it does not become a `PANEL_TABS` row.

## The Present overlay

A full-viewport overlay (z-50, in-app — not a route, so no changes to the
frozen route sets, `windowTitle`, or `openingPath`). Esc and the close button
leave it; the editor state underneath is untouched.

### Look

Decided 2026-08-24 from `docs/mocks/2026-08-24-present-look-options.html`:
**Keycap as the default family, the Reading-light paper tints as further
options.** The old editorial reel theme (Playfair on dark pairs, film grain,
vignette, watermark) is not ported. One tone system skins both Present and
the exported video — seven full-bleed tones in one picker:

| Family | Tones | Display font | Support font | Active-word accent |
| --- | --- | --- | --- | --- |
| Keycap (default) | **Indigo** (default) · Ink · Paper | Noto Sans 700 | Noto Sans 500 | indigo, tone-matched |
| Reading light | Cream · Sage · Blush · Sky | Fraunces 550 | Noto Sans 500 | amber-700 · emerald-700 · rose-700 · sky-700 |

Word states in every tone: already-spoken words dim to 55% opacity; the
active word takes the accent colour and underline. No decoration layers —
Keycap tones sign the corner with the Sep keycap mark, paper tints with a
small ink "September" wordmark.

DESIGN.md impact: the Keycap tones are pure system — existing fonts and
tokens, no deviation. The paper tints add **Fraunces** as a scoped
presentation serif; when this ships, a new decision row replaces the
2026-07-17 Playfair reel row (Playfair and the six dark pairs retire).

Unlike the old 9:16 story player, Present is **full-bleed**: the tone colour
fills the whole screen and the chunk text fits the viewport (pretext layout —
largest font that fits, ~7% side padding). A Mac or iPad faces the audience in
landscape; locking a phone aspect ratio would waste most of the screen. The
9:16 frame remains the shape of the *exported video* only.

### Chunking (pure rules, `rules/present.ts`)

`presentChunks(content)`:

1. Strip markdown with the existing `markdownToVoiceText` per block.
2. `---` / `***` lines are hard section breaks — notes authored for the old
   slides feature still present correctly.
3. Within a section, one chunk per sentence; sentences over ~140 characters
   split at clause punctuation.

Role rule (deterministic, replaces the old per-caption punctuation rule which
degenerates at sentence granularity): a chunk renders in the **display** role
when it is a markdown heading or the first chunk of a section; otherwise
**support**.

### Two modes, one control

- **Spoken** (default when any voice is configured): each chunk is spoken via
  the existing `speak()`; when playback ends the next chunk rises in. The
  ElevenLabs→system fallback already guarantees sound. Requires one service
  contract to be made explicit and tested: *`speak()` resolves when playback
  ends, not when it starts.*
- **Silent**: no audio; the presenter advances manually and the partner reads.
  Works with zero configuration — this is the AAC "flash big text" mode.

A single speaker toggle in the overlay chrome switches modes mid-presentation.

### Chrome and input

- Segmented progress strip (one 2.5px segment per chunk) top.
- Close (44px, top-right) · speaker toggle · the seven tone swatches behind a
  single "Colours" toggle (not always visible — presenting is not editing).
- Tap zones in thirds: previous / pause-resume / next, full height.
- Keys: `←` `→` advance, `Space` pause/resume, `Home`/`End`, `Esc` close.
- Chunk rise-in animation, disabled under `prefers-reduced-motion`.
- Word-level highlight (karaoke) is **not** in v1 spoken mode — it needs
  character timing. It arrives free once the video pipeline lands (below).

### Desktop: presenting into a call

The two native bridges make Present work over FaceTime/Zoom with no new
native code:

- **September Microphone** already captures native speech playback — a
  presented note's voice reaches the call as soon as the mic is on.
- **September Camera**: while a presentation is running and the camera is on,
  the overlay text follows the *current chunk* via the existing
  `updateVirtualCameraOverlay(text, visible)`, and returns to the Talk
  composer draft when the presentation closes. This deliberately amends the
  AGENTS.md rule "pass the Talk composer text, not the text from Notes" —
  rewrite it as: *the Talk draft owns the camera overlay, except while a
  presentation runs; then the presented chunk owns it.*

The web `updateVirtualCameraOverlay` is already a no-op stub, so the block is
identical on both apps. A dedicated `present-*` second window (external
display) is a follow-up, not v1.

## The Export dialog

A shadcn `Dialog`, title "Export", three artifact rows with big targets:

| Row | File | Needs | Unavailable state |
| --- | --- | --- | --- |
| **Text** | `<note-slug>.md` | nothing | never |
| **Audio** | `<note-slug>.mp3` | an ElevenLabs voice | `aria-disabled` + "Uses your ElevenLabs voice" |
| **Video** | `<note-slug>.mp4` | ElevenLabs timing + renderer | `aria-disabled` + reason |

- **Text** writes `note.content` as a Blob download (the `downloadUsageCsv`
  pattern — works identically in the browser and the Tauri webview).
- **Audio** reuses the cached ElevenLabs speech blob/file for
  `markdownToVoiceText(content)`; generation shows an inline progress state.
- **Video** expands in place: the seven tone swatches (same as Present), a
  Preview button
  (opens the Present overlay in timed preview), a progress bar over the
  status machine `idle → generating voice → rendering video → ready`, then
  Save. The renderer is the ported `reel-renderer.browser.ts`: 1080×1920
  canvas caption frames + audio muxed by `ffmpeg.wasm`, rethemed to the tone
  system (its Playfair/pair/grain constants are replaced by the
  `rules/present.ts` tone tokens; the font loader fetches Fraunces only for
  paper tints). Karaoke captions keep the *old* ≤6-word caption chunking and
  punctuation role rule — that timing code is restored untouched into
  `rules/present.ts`.

Every export and every presentation records one analytics event
(`note_present`, `note_export` with `{kind}`) in the existing
`analytics_events` store/table — no schema change.

## Word timing (the one service extension)

Video export (and later karaoke in Present) needs character alignment. Extend
the speech service with `synthesizeTimed(text) → { blob, alignment }` using the
ElevenLabs `/v1/text-to-speech/:id/with-timestamps` endpoint:

- **Web**: cache blob + alignment JSON in the existing `blobs` LRU store
  (keyed `speech-timed:<sha256>`); no new database.
- **Desktop**: the Rust speech command gains a timed variant; audio file in
  the app audio directory as today, alignment JSON beside it.

System voices never produce alignment; the Video row's availability reflects
the configured voice.

## Platform availability

| Capability | Web | Desktop |
| --- | --- | --- |
| Present, silent | always | always |
| Present, spoken | any voice | any voice; call hears it when September Microphone is on |
| Captions on call video | — (stub) | September Camera overlay |
| Export Text | always | always |
| Export Audio | ElevenLabs | ElevenLabs |
| Export Video | ElevenLabs; COOP/COEP already deployed for `ffmpeg.wasm` | lands second — needs webview cross-origin isolation, or the single-thread ffmpeg core |

## Code placement (mirrored, ported deliberately — no shared UI source)

| Piece | Desktop | Web |
| --- | --- | --- |
| Chunking, roles, tones, theme constants, progress math | `src/rules/present.ts` (node-tested) | `src/rules/present.ts` (vitest) |
| Present overlay + pretext fit-text | `src/blocks/present.tsx` (two consumers: notes header, export preview) | `src/blocks/present.tsx` |
| Export dialog | in `src/pages/notes.tsx` | in `src/pages/notes.tsx` |
| File save, audio/video export, status machine | `src/services/export.ts` | `src/services/export.ts` |
| Timed synthesis | `src/services/speech.ts` + Rust command | `src/services/speech.ts` / `os.ts` |
| Camera bridge during presentation | existing `services/os.ts` call from the overlay | same call (stub) |

New settings key `present` (last tone, spoken/silent) in the existing settings
table/store. No new SQLite migration, no new IndexedDB store.

## Test-first sequence

1. `rules/present.ts` in both apps: chunking (sections, sentences, long-
   sentence split), role rule, tone table completeness, progress math, plus
   the restored caption/role functions for video. Pure tests first.
2. Web Present overlay: silent mode, chrome, keys, reduced motion; then
   spoken mode with the "speak resolves on playback end" contract test.
3. Desktop port of the overlay + header pills; source-regex tests in
   `tests/bootstrap.test.mjs`; camera-bridge test (chunk text while
   presenting, Talk draft after close); update the AGENTS.md camera rule;
   add new copy to `tests/copy.test.mjs` and `copy-contract.test.ts`.
4. Export dialog + Text artifact, both apps.
5. Audio artifact, both apps (ElevenLabs cache path; `aria-disabled` reason
   otherwise).
6. `synthesizeTimed` + restored video renderer on web; desktop follows.
7. Docs: new concept doc `docs/concepts/note-present-export.md`; module
   READMEs; DESIGN.md decision row (the presentation tone system: Fraunces
   scoped to paper tints, replacing the Playfair reel row); refresh the web
   landing section that still says "reel".

## Acceptance

- A note presents full-screen on both apps with no configuration, silently.
- With any voice configured, Present speaks each chunk and auto-advances.
- On the Mac, a FaceTime callee hears the presented note when September
  Microphone is on and sees the current chunk when September Camera is on;
  closing the presentation restores the Talk overlay text.
- Export saves `.md` always, `.mp3` with an ElevenLabs voice, and `.mp4`
  matching the Present look with word-synced karaoke captions.
- Copy contains "Present"/"Export" and never "reel"; the copy contract and
  desktop contract tests pass; both apps' test, lint, and build commands pass.

## Out of scope (follow-ups)

- Word-level karaoke inside live Present (unlocked by the timing service).
- A `present-*` second window on an external display (capability already
  allowlisted).
- Exporting system-voice audio on desktop (`AVSpeechSynthesizer.write`).
- Presenting a Talk transcript; PDF export.
