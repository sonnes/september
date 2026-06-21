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
`/notes/:spaceSlug/:noteSlug` for individual notes; Talk mode uses
`/talk/:spaceSlug`.

The same rich editor powers global notes and space notes. In note mode, the
editor autosaves note content and drops the document action footer. The note
selector lives in the app right panel. Voice-over and audio download actions
live there for the selected note.
Voice-over uses the same speech settings as Talk, but it does not create a chat
message or append text to the transcript.

The selected note can also export a vertical MP4 reel. Reel export uses the
configured ElevenLabs voice because the MP4 captions need character-level
timing. The browser generates the note audio and timing, then a TanStack Start
server function renders a 1080x1920 MP4. The renderer rasterizes SVG caption
frames with `sharp`, encodes those PNG frames with FFmpeg, and writes temporary
files only. Note content and audio are not stored on the server.

Deleting a space cascades its messages, saved phrases, and scoped notes.
