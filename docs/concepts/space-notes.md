---
title: Space notes
description: Long-form notes inside a Talk space, using the document editor and the configured speech voice for note voice-over.
package: documents
---

# Space notes

Space notes let the user switch the existing Talk screen from quick speech to
long-form writing without leaving the space. The Talk composer remains the fast
path for one utterance; Notes mode is for longer prepared text that can be read
back with the current speech voice.

Notes are stored in `documentCollection` with `space_id` set to the parent
space. Existing documents without `space_id` remain global documents for the
legacy Write route.

The same rich editor powers global documents and space notes. In note mode, the
editor autosaves note content and drops the document action footer. Voice-over
and audio download actions live in the notes sidebar for the selected note.
Voice-over uses the same speech settings as Talk, but it does not create a chat
message or append text to the transcript.

Deleting a space cascades its messages, saved phrases, and scoped notes.
