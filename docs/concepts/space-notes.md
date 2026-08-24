---
title: Space notes
description: Notes store prepared long-form text inside a Talk space and use the same voice as Talk.
package: desktop, web
---

# Space notes

Notes add long-form text to a space. Talk remains the fast path for one spoken message.

The desktop and web apps use the same plain-text note screen. Markdown stays in the `content` field.

The desktop app stores notes in SQLite. The web app stores notes in the `notes` IndexedDB store.

## Routes

Notes use these routes:

```text
/spaces/$slug/notes
/spaces/$slug/notes/$noteSlug
```

The first route opens the About tab or the first note. The second route opens one named note.

## Editing

The editor saves 600ms after the last keystroke. It also saves pending text when the screen closes.

The first save creates a title from the first six words. The user can change the title later.

The composer can append text to the open note. It provides the same word suggestions, undo action, and clear action as Talk.

## About tab

The About tab edits the `context` field of the space. Phrase generation and writing prompts read this field.

The About tab saves when its field loses focus. It also saves pending text when the tab closes.

## Voice-over

Voice-over uses the same voice settings as Talk. It does not create a message or change the Talk transcript.

Removing a space also removes its scoped notes, messages, and phrases in one repository operation.
