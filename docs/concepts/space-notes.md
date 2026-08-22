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

## The desktop app

The desktop app ports the core of this concept, and not the whole of it.

Notes live in the SQLite `notes` table, which cascades from `spaces`. The four
Rust commands `note_list`, `note_get`, `note_put`, and `note_delete` are the
only way in. `src/data.ts` holds the hooks; no screen calls `invoke`.

The desktop writing surface is a plain text field, not the rich editor. Both
apps keep markdown in the same `content` column, so a row written by one app
reads correctly in the other. The desktop screen has no toolbar.

Notes keeps the console of Talk, as the web app does: the note tabs, the word
tiles, the field, undo, delete last word, clear, and **Add to note**. The
composed words go under the note after a blank line. The note editor above it
is the second way in, for a user who can type.

A note saves 600 ms after the last keystroke, and again when the screen closes
with words unsaved. The first save names the note from its first six words.
Voice-over uses the same voice as Talk and writes no message.

The first tab of the console is About. It opens the `context` column of the
space, which says who the user speaks to here and why. A model writes this
column one time, from the first message of the space. The user writes over it
in this tab. The suggestion prompt and the phrases prompt both read the
column, so a change here changes the words that the app offers.

The About tab saves the same way a note does, and the console writes into it.
Therefore a user who cannot type fills this note with the word tiles. The tab
is state in the screen, and not an address.

The desktop routes are `/spaces/$slug/notes` and
`/spaces/$slug/notes/$noteSlug`. Two tabs in the header move between Talk and
Notes, in place of the bottom-dock mode row of the web app. The desktop app
keeps the mode of each space, by slug, in the `space-modes` setting.

Reel export, the story player, the slide presentation, the file upload, and
the audio download are not in the desktop app.

Deleting a space cascades its messages, saved phrases, and scoped notes.
