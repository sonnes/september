# Port notes to the desktop app

## Context

The desktop app has one mode inside a space: Talk. Talk is for one short
sentence, spoken now. The web app has a second mode: Notes, for long text that
the user prepares and then hears back in the chosen voice.

A user who cannot speak needs both. Talk answers a question at the table. Notes
holds the letter, the story, or the doctor's list, written over days.

The Rust side of notes is already finished and shipped. Only the TypeScript UI
is absent. This plan adds that UI.

### What is already in place

Nothing in `src-tauri/` changes. All of this exists today:

| Piece                                                      | Where                              |
| ---------------------------------------------------------- | ---------------------------------- |
| `notes` table, with a cascade from `spaces`                 | `src-tauri/migrations/0001_initial.sql` |
| `Note` struct, `list_notes`, `get_note`, `put_note`, `delete_note` | `src-tauri/src/repository.rs:58,291-345` |
| `note_list`, `note_get`, `note_put`, `note_delete` commands | `src-tauri/src/rpc.rs:272-320`     |
| The four commands, registered                               | `src-tauri/src/lib.rs`             |
| A test for the cascade delete                               | `repository.rs:677`                |

### Decisions the user made

1. **The writing surface is a plain textarea, not Tiptap.** The `content`
   column already holds markdown, so the rows stay the same shape as the web
   rows. This adds no dependency.
2. **Scope is core notes and voice-over.** Audio download, reel export, and
   slide presentation are out.

## Steps

Write a failing test before each change, as `AGENTS.md` requires.

### 1. The rules of a note — `src/notes.ts` (new)

Port the pure rules from `apps/web/src/packages/notes/lib/title.ts` and
`lib/reel.ts`. A test reads this file without a renderer.

| Export                    | Job                                                     |
| ------------------------- | ------------------------------------------------------- |
| `UNTITLED_NOTE`           | The placeholder name, `Untitled note`                   |
| `noteNameIsUnset(name)`   | Whether the note still has no name of its own           |
| `noteNameFromContent(md)` | The first six words of the text, as a name              |
| `noteContentUpdates(name, content)` | The fields to write, with a name on the first save |
| `noteSlug(name)`          | The URL name of a note                                  |
| `noteFromSlug(slug, notes)` | The note that a slug names                            |
| `markdownToVoiceText(md)` | The text of a note, with the markup removed             |

First refactor `spaceSlug` in `src/spaces.ts` into a shared
`slugify(text, fallback)`. `spaceSlug` falls back to `space`; a note falls back
to `note`. Do not copy the regular expressions into a second file.

Add the tests to `tests/bootstrap.test.mjs`, beside the space tests.

### 2. The reads and the writes — `src/data.ts`

Add a `Note` interface and three hooks, next to the phrase hooks. Use the
`call()` helper that is already there. `AGENTS.md` forbids `invoke` in a
component.

```ts
export interface Note {
  id: string;
  space_id?: string;
  name?: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export function useNotes(spaceId: string)   // note_list
export function usePutNote()                 // note_put
export function useDeleteNote()              // note_delete
```

`note_put` writes one complete row. Two writers touch a note: the title field
and the autosave. Give `usePutNote` a patch, and fill the other fields from the
cached row inside the mutation. This is the same fault that `space_patch`
corrects for a space. A note has one screen and one user, so the cache is
enough here. Mark it with a `ponytail:` comment.

### 3. The screen — `src/notes.tsx` (new)

`NotesScreen({ slug, noteSlug })` follows the shape of `Talk` in
`src/talk.tsx`. It uses `Screen`, `ScreenHeader`, and `SpaceDock`.

From the top:

1. **The header.** `ScreenHeader` with the space title, the mode tabs, and a
   Voice-over button.
2. **The note title.** An `Input` with `text-title`, as `DESIGN.md` states.
   It saves when it loses focus. Enter saves. Escape puts the old name back.
3. **The note.** A textarea with `text-xl`, which `DESIGN.md` gives to a
   composer. It autosaves 600 ms after the last keystroke, and again when the
   screen closes.
4. **The note tabs.** A row of pills above the dock, in the slot that
   `Suggestions` fills in Talk. One pill for each note, and a `New note`
   button. Port the overflow list from `note-tabs.tsx` only if the row does not
   fit at 1376 px.
5. **The dock.** `SpaceDock`, exported from `src/talk.tsx`. Give it a `mode`
   prop, so a space tab keeps the mode the user is in.

Delete a note behind an `AlertDialog` with a `destructive` button, as
`AGENTS.md` requires for an action that erases rows.

An empty space shows an empty state with one `New note` button. The desktop app
has no toast, so a failed write shows the message in place, as `Problem` does
in `talk.tsx:80`.

### 4. The routes and the mode switch

Add two routes to `src/main.tsx`, beside `talkRoute`:

- `/spaces/$slug/notes` — opens the newest note of the space
- `/spaces/$slug/notes/$noteSlug` — opens one note

A slug that names no note goes back to `/spaces/$slug/notes`. A new name makes
a new slug, so the title field must navigate with `replace: true`. `talk.tsx`
does this after a model renames a space.

Add `SpaceModes` to `src/shell.tsx`, which both screens import. Two tabs, Talk
and Notes, in the header beside the space title.

> This differs from `docs/concepts/space-navigation.md`, which puts the modes in
> the bottom dock and remembers the last mode of each space. Header tabs are the
> smaller change. Record the difference in the notes file.

### 5. Voice-over

The Voice-over button reads the note aloud:

```ts
speak(markdownToVoiceText(note.content), `note-${note.id}`)
```

`speak` and `useSpeaking` are already in `src/speech.ts`. The button shows Stop
while the note plays, as the message bubbles do in `talk.tsx`. A cloud voice
that fails falls back to the voice of the Mac, which `speech.ts` already
handles. Voice-over writes no message and touches no transcript.

### 6. Documents

- `apps/desktop/README.md` — a `Write a note` section after `Talk in a space`.
- `apps/desktop/AGENTS.md` — two rules: keep the note rules in `src/notes.ts`;
  read and write a note through `src/data.ts`.
- `docs/concepts/space-notes.md` — a desktop paragraph: SQLite, a plain
  markdown textarea, and no reel or slides.
- `docs/notes/2026-08-21-desktop-notes.md` — the running notes file, linked to
  the plan.

## Files

| File                              | Change                                  |
| --------------------------------- | --------------------------------------- |
| `apps/desktop/src/notes.ts`        | New. The pure rules.                    |
| `apps/desktop/src/notes.tsx`       | New. The screen.                        |
| `apps/desktop/src/spaces.ts`       | `slugify(text, fallback)`.              |
| `apps/desktop/src/data.ts`         | `Note`, and three hooks.                |
| `apps/desktop/src/main.tsx`        | Two routes.                             |
| `apps/desktop/src/shell.tsx`       | `SpaceModes`.                           |
| `apps/desktop/src/talk.tsx`        | Export `SpaceDock`; add the mode tabs.  |
| `apps/desktop/tests/bootstrap.test.mjs` | The tests for `notes.ts`.          |

No file in `src-tauri/` changes. No dependency is added.

## Verification

1. `pnpm test` — the new rules pass, and the 92 tests before them still pass.
2. `./node_modules/.bin/tsc --noEmit` — no type error.
3. A browser check, in the shape of `/tmp/check-talk.mjs`: headless Chrome
   against Vite, with `window.__TAURI_INTERNALS__` stubbed. It must show that:
   - the Notes tab opens `#/spaces/general/notes`
   - `New note` makes a row and selects it
   - typing autosaves, and `note_put` carries the text
   - the first save gives the note a name from its first words
   - the address follows a renamed note
   - Voice-over calls the speech command with the text, not the markup
4. `pnpm tauri:dev` — write a real note, then press Voice-over and hear it.
5. `cargo test`, `cargo clippy`, and `cargo fmt --check` — unchanged, but run
   them, because `AGENTS.md` asks for them before a commit.

## Time

About one day. The screen is about half of it.

## Left out

| Piece                | Why                                                   | Add when                          |
| -------------------- | ----------------------------------------------------- | --------------------------------- |
| Tiptap rich text     | 6 dependencies for a markdown column we already hold   | A user asks for a toolbar         |
| Audio download       | Needs the Tauri dialog and fs plugins, and a command   | A user wants the file             |
| Reel export          | About 1900 lines, `ffmpeg.wasm`, and a timed voice     | Reels matter on the desktop       |
| Slides presentation  | A second window, about 450 lines                       | A user presents from the Mac      |
| Notes across spaces  | The web `/notes` list. A space holds its own notes.    | A user loses a note               |
| Last-mode memory     | The dock in `space-navigation.md`                      | The header tabs feel wrong        |
