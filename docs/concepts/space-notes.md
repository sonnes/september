---
title: Space notes
description: Long-form notes inside a Talk space, using the document editor and the configured speech voice for note voice-over and reel export.
package: notes
---

# Space notes

Space notes let the user switch the existing Talk screen from quick speech to
long-form writing without leaving the space. The Talk composer remains the fast
path for one utterance; Notes mode is for longer prepared text that can be read
back with the current speech voice.

Notes are stored in `noteCollection` with `space_id` set to the parent
space. `/notes` lists all notes across spaces. Notes mode uses
`/spaces/:spaceSlug/notes/:noteSlug` for individual notes; Talk mode uses
`/spaces/:spaceSlug/talk`.

The same rich editor powers global notes and space notes. In note mode, the
editor autosaves note content and drops the document action footer. The note
selector is a working-set strip of note tabs (`NoteTabs`) directly above the
composer — the same slot pinned phrase rows occupy in Talk. Voice-over, audio
download, and reel export (`NoteActions`) live in the editor header for the
selected note. Voice-over uses the same speech settings as Talk, but it does
not create a chat message or append text to the transcript.

The selected note can also export a vertical MP4 reel. Reel export uses the
configured ElevenLabs voice because the MP4 captions need character-level
timing. The browser generates the note audio and timing, renders 1080x1920
caption frames with Canvas, and muxes those frames with the audio through
`ffmpeg.wasm`. Note content and audio stay in the browser during export.

The reel look is one editorial system, defined once in
`packages/notes/lib/reel-theme.ts` and rendered identically by the in-app story
player (DOM) and the exported MP4 (canvas): a solid Tailwind colour background
with film grain and a soft vignette, a serif display headline (Playfair Display)
over Noto Sans support text, and a "September" watermark. Each caption chunk
gets a role from punctuation — the first chunk, or a chunk after a sentence end
(`. ! ?`), is a **display** headline; a continuation chunk is **support** text —
so both renderers compute the same sequence. The colour is chosen per export
from six Tailwind pairs (default `stone`) in the reel export panel and applies to
both the story player and the MP4; it is not persisted.

Deleting a space cascades its messages, saved phrases, and scoped notes.
