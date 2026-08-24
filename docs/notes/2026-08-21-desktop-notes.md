---
title: Port notes to the desktop app
plan: docs/plans/2026-08-21-desktop-notes.md
---

# Implementation notes

Only what the plan does not say.

## The Rust side needed no change

The plan expected this, and it held. The `notes` table, the `Note` struct, the
four repository methods, the four RPC commands, and the cascade test were all
in place from an earlier commit. This port is TypeScript only, and adds no
dependency.

## Two files cannot both be called `notes`

`src/notes.ts` holds the rules and `src/notes.tsx` was to hold the screen. Both
resolve from `./notes`, and TypeScript picks the `.ts` file, so `main.tsx`
imported a module with no `NotesScreen` in it.

The screen is now `src/notes-screen.tsx`. This breaks the naming of the other
screens (`talk.tsx`, `voice.tsx`, `settings.tsx`), which are named for their
mode. The other repair was to import with an explicit extension
(`./notes.tsx`), which nothing else in the app does. A file name that reads
oddly is better than an import rule that holds in one file only.

`src/notes.ts` itself imports `./spaces.ts` with the extension, because
`node --test` runs these modules without a bundler and needs it.

## `slugify`, not a second copy of the rule

`spaceSlug` held the slug rule and fell back to the word `space`. A note with
no name needs the word `note`. `spaces.ts` now exports
`slugify(text, fallback)`, and `spaceSlug` calls it. No regular expression is
written twice.

## One writer at a time, not a patch command

The plan asked for a cache merge inside `useUpdateNote`. It reads the row from
Rust instead, with `note_get`, and writes the merged row back with `note_put`.
Reading the truth is shorter than keeping a second copy of it in the query
cache, and it is correct when the cache is stale.

Two calls are not one statement, so a second writer in the gap would still be
lost. A note has one screen and one user, which spaces did not, so the gap
cannot hold one. `space_patch` exists because a space has three writers.

## The title field needed a sync

`NoteEditor` is keyed on the note ID, so a new note resets the state. That is
not enough: the first save renames the note the user is already writing in, and
the title field kept its empty value while the tab showed the new name. One
`useEffect` on `note.name` corrects it. The browser check now asserts the
title, not only the row in the store.

## The mode switch moved to the dock

The first build put the Talk and Notes tabs in the header. That was the smaller
change, but it did not match the web app, and the user asked for the web
shape. The switch is now in the dock, on the right, with a `pl-5` gap from the
space tabs, as `components/nav/space-dock.tsx` has it.

`SpaceModes` is gone from `shell.tsx`. `ModeGroup` in `talk.tsx` is the port:
a `tablist` with a roving tabindex, so one Tab press leaves the group and the
arrow keys move inside it.

The dock also gained the overflow fallback. The row is measured, not counted:
it overflows its box exactly when the tabs no longer fit, which holds at every
width and every title length. The row stays mounted and turns transparent, so
it can still be measured while the list is shown.

`DropdownMenuItem` was missing from `src/components/ui/dropdown-menu.tsx`,
which another session added for a narrower use. It is a standard shadcn export,
and the "New space" row of the list needs it.

## The mode of each space is kept

The web app keeps this in `localStorage`, keyed by slug. The desktop app keeps
it in the `space-modes` setting, beside `dismissed-ideas`, because that is
where this app puts an answer the user gave once.

The rules are pure and live in `spaces.ts`: `spaceModeFrom(modes, slug)` and
`rememberSpaceMode(modes, slug, mode)`. A value that names no mode falls back
to Talk, so a setting written by an older build cannot open a screen that is
not there.

## The right rail

`PanelRail` is a port of `components/chat/right-panel.tsx`. The desktop rail
has one button, Phrases. `Voice` has a screen of its own, and the desktop app
has no display window, so those two rail buttons are not ported.

The old `PhrasePanel` sheet is gone. Its body became the card, and the header
button of Talk that opened it is gone with it.

The web app portals the rail into a slot outside the inset, so it renders as
its own card in the sidebar flex row. The desktop app does the same, through
`RightPanel` in `shell.tsx`. Drawing the rail inside the screen was tried
first: it shares the one white card of the inset, which is not the design.

Radix opens a menu on `pointerdown`, not on `click`, so the browser check
dispatches the full pointer sequence. A `.click()` alone leaves the menu shut.

## Notes keeps the console of Talk

The first build gave Notes a bare textarea and no console. That missed the
point of the mode. A user with ALS does not type a note; they build it one
sentence at a time through the word tiles, the phrase codes, and delete last
word, exactly as in Talk. The web app shares one `composerConsole` between the
modes for that reason.

`Composer` is now exported from `talk.tsx` and used by both screens. It takes a
`mode` and derives the label, the icon, the placeholder, and whether the sound
output shows, which is fewer props than passing each one.

`Suggestions` gained an optional `history`. Notes gives it the note, so the
words the engine offers follow what the user is writing there, not the last
things they said aloud.

## The editor wrote over the console

The browser check caught this, and the unit tests could not have. The composer
appended words, the row in SQLite held them, and then the editor saved its own
stale copy over the top a moment later.

`NoteEditor` held `content` in state from the first render. It had no way to
learn that another writer had changed the row. The web solves this in
`use-note-editor.ts` with a render-phase sync, and that is now ported: when the
note ID changes, or the row changes while nothing here is unsaved, the field
takes the new text.

The save that runs as the screen closes was also writing on every navigation,
because it guarded on the content and not on whether anything was unsaved. It
now reads a ref that mirrors the dirty state, so a clean note causes no write
and cannot race the other writers of the row.

## The `text-title` token was missing

`DESIGN.md` names `--text-title` (17px) for a note title and says `globals.css`
holds it. That is the web app. `src/styles.css` now defines it too.

## Checks

- 107 `node --test` tests in this file, and `tsc --noEmit` clean.
- A browser check in `/tmp/check-notes.mjs`, in the shape of the Talk one: 36
  assertions over the dock switch, the overflow list, the right rail, the empty
  state, the autosave, the naming, the address, the voice-over, the note tabs,
  the delete dialog, the kept mode, and the console that files words under the
  note.
- The mode switch is a `tablist` too, so two tabs are always on screen. A wait
  for "two tabs" matched before the note tabs rendered, and the check failed
  about one run in three. It now waits for four.
- The overflow check first failed with seven spaces, which measured 954px in a
  954px row. The tabs fit. Nine longer titles make the row overflow, and the
  fallback then shows. The logic was right; the case was too narrow.
- A `Page.navigate` reloads the document and rebuilds the stub, so a space
  pushed into the stub after the first load does not survive one. The extra
  spaces are seeded before the first paint.
- The Talk check kept a fixed 2500 ms wait after a navigation, which was not
  long enough here. The notes check waits for the screen and then for the
  state, so it does not race a render.
- A Chrome left over from an earlier run keeps its window and its stub state,
  which made the check pass once and fail after. The harness now kills any
  Chrome holding the profile before it starts.
