---
title: Space notes
description: Notes are Markdown documents inside a space. Writing tools with the Talk suggestions open at the caret, and a reading bar reads, presents, and exports the note.
package: core, app-ui, desktop, web
---

# Space notes

Notes add long-form text to a space. Talk remains the fast path for one spoken message.

The desktop and web apps use the same note screen. The note is a document of Markdown lines, and Markdown stays in the `content` field.

The desktop app stores notes in SQLite. The web app stores notes in the `notes` IndexedDB store.

## Routes

Notes use these routes:

```text
/spaces/$slug/notes
/spaces/$slug/notes/$noteSlug
```

The first route opens the About tab or the first note. The second route opens one named note.

## Editing

The editor starts saving text and titles on each edit. Note-update writes run
in order within a space. A stale query refresh cannot replace a pending edit.
A failed save leaves the words visible and offers Retry saving.

Pending or failed edits guard normal browser closing and Mac window closing.
A forced quit or device failure before the write completes can still lose edits.

The first save creates a title from the first six words. The user can change the title later.

The title and the headings use the Fraunces serif. The body uses Noto Sans.

Each line shows its format: headings, bullets, numbers, checklists, quotes, bold, and italic. The line that has the caret also shows its Markdown, so the user can see and change it. Enter continues a list, and Enter on an empty item ends it.

The words go in at the caret. On the first typed key, the writing tools open under the caret line. Near the bottom of the page, they open above the line. The tools contain these parts:

- The style keys: Heading 1, Heading 2, Bulleted list, Numbered list, Checklist, Quote, Bold, and Italic. A second tap on a line style removes it.
- Undo and Delete last word. The tools have no Clear action.
- The suggestion stripes of Talk. The stripes read the sentence before the caret, and a take replaces that sentence. The end key of a row puts in the full row and starts a new line.
- The writing service gets the full note with a `<caret/>` mark, in place of the conversation. Its rows continue the note at the caret. The history rows come from the other lines of the note.

Escape or Hide closes the tools. ⌘J or Ctrl+J opens them with no typed key.

While the note has the focus, a bar shows at its start edge: an ink line inside
amber. A note opens at its top. After the user moves the caret or writes, the
note scrolls until the caret line is clear of the 96px that the reading bar
takes at the foot of the page, with 24px of room above the line.

## Reading bar

The reading bar is at the foot of the page. It has Read aloud, Present, Suggestions, and a More menu with Export and Delete note. The bar hides while the writing tools are open.

## The list of notes

The list shows About first, then each note with its name, its first line of words, and the time of its last change. From five notes, a search field with the visible label Search notes finds a note by its words. New note is at the top of the list.

From 52rem of screen body, the list is a column beside the note. Below that width, the list and the note take turns. Notes opens on the last note, and its All notes back key shows the list.

## About tab

The About tab edits the `context` field of the space, in the same document editor. Phrase generation and writing prompts read this field.

The About tab saves when its field loses focus. It also saves pending text when the tab closes.

## Read aloud

Read aloud uses the same voice settings as Talk. It reads the selected words when there is a selection. Otherwise, it reads the full note. It does not say the box of a checklist line. It does not create a message or change the Talk transcript.

Removing a space also removes its scoped notes, messages, and phrases in one repository operation.
