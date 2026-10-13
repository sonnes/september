---
plan: docs/plans/2026-10-13-notes-doc-editor.md
---

# Notes as a Markdown Document: Implementation Notes

- Read aloud does not highlight the spoken line. The speech service tells only which item speaks, not which word or line. The mock showed a highlight.
- Enter is handled by the editor and not by the browser. Enter continues a list, a numbered list, a checklist, or a quote. Enter on an empty item ends the list. Shift+Enter starts a plain line. The plan did not name this.
- The Undo key undoes the edits of the tools: a take, a style, Delete word, and paste. It does not undo typed keys. This is the same as the Talk composer. ⌘Z after a tool edit does not work, because the editor draws the lines again.
- Paste puts in plain text only.
- The panel offers no Clear in Notes. `ComposerHandle.clear` is now optional, and ⌘⌫ keeps its macOS meaning in a note.
- The About tab uses the same document. It still saves on blur and on close.
- A checklist box is not a button. The Checklist key sets and removes the box. `- [x]` typed by hand shows a checked box.
- The `Saved` line under the title replaces the old `Saving…` status paragraph. It says `Saved`, `Saving…`, or `Not saved`.
- `ComposerMode` no longer has `notes`, because no console writes in Notes.
- The writing service reads the full note with a `<caret/>` mark. The note takes the place of the conversation history in the prompt. A long note goes in full, with no limit.
- The history rows of the stripes come from the other lines of the note. The caret line is left out, because it only gave back the words being typed.
- The tools are one row. Hide is an `Esc` key, so the row fits 600 points. A narrower panel scrolls the row sideways.
- The note tabs became a list (mock `docs/mocks/2026-10-13-note-selector-options.html`, Option B). The width break is a container query at 52rem, so the web app and every tier of the desktop panel follow the width of the screen body and not the device.
- On a narrow screen, the list and the note take turns through a `data-pane` state. It is not part of the address. A deep link opens the note.
- About is a row of the list. Its line under the name is the first line of the About text.
- Below 36rem, the reading bar shows only icons for Present, Suggestions, and More. Their names stay for screen readers.
