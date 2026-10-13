---
title: Notes as a Markdown document
mock: docs/mocks/2026-10-13-notes-doc-editor.html
---

# Notes as a Markdown Document

The user approved the mock `docs/mocks/2026-10-13-notes-doc-editor.html` with these choices:

- The suggestion stripes float under the caret line, or above it near the bottom.
- Esc hides the stripes. The Hide button does the same.
- The note actions are in a reading bar at the bottom of the page.
- The note title and the headings use Fraunces. The body uses Noto Sans.
- A style row is at the top of the stripes overlay.

## Behavior

1. The note is one editable document. The title is the first line of the page. The body has no box.
2. Each Markdown line shows its format. The line that has the caret shows the Markdown syntax.
3. The note keeps plain Markdown in `content`. Saving, Read aloud, Present, and Export do not change.
4. The composer and "Add to note" go away from Notes. Words go in at the caret.
5. The stripes appear on the first typed key, or when the user presses Suggestions or ⌘J.
6. The stripes read the sentence before the caret. A tap on a tile replaces that sentence with the tiles up to the tap.
7. The end key of a row puts in the full row and starts a new line.
8. The overlay has the style row, Undo, Delete word, and Hide. It has no Clear.
9. A line style changes the caret line. A second tap removes it. Bold and italic wrap the selection, or the word at the caret.
10. The reading bar has Read aloud, Present, Suggestions, and a More menu with Export and Delete note. The bar hides while the stripes show.
11. Read aloud reads the selection when there is one. Otherwise, it reads the full note.
12. The notes are a list beside the page. See the mock `docs/mocks/2026-10-13-note-selector-options.html`, Option B.
13. The About tab uses the same document, with its own save on blur.
14. Read aloud does not say the checkbox of a task line.

## Files

- `packages/core/rules/note-document.ts`: pure line rules (kind, style toggle, inline wrap, sentence before the caret, range replace, inline parts).
- `packages/core/rules/notes.ts`: `markdownToVoiceText` removes task boxes.
- `packages/app-ui/blocks/note-document.tsx`: the editor, the overlay, and the style row.
- `packages/app-ui/pages/notes.tsx`: tabs on top, the reading bar, no composer.
- `packages/app-ui/blocks/chrome.tsx`, `layouts/panel.tsx`, `blocks/panel-header.tsx`: Clear is optional on the composer handle.
- `packages/ui/theme.css`: the `--font-heading` token.
- `DESIGN.md`, `docs/concepts/space-notes.md`, and the package READMEs.

## Tests

- Core rules: unit tests for each pure function.
- `apps/web/src/note-saving.test.tsx`: the existing save tests on the new editor.
- `apps/web/src/note-document.test.tsx`: stripes show on input and hide on Esc, a take replaces the sentence at the caret, a style toggles a line, and the reading bar reads a selection.
