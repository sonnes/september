---
title: Space-first navigation
description: How a space is opened and moved through — the /spaces route tree with per-space last-mode memory, the bottom dock (spaces + modes), the per-mode working-set slot, and the collapsible right rail.
package: spaces
---

# Space-first navigation

A space is the unit of navigation. You pick a space, then a mode within it;
the app remembers which mode each space was last in, so returning to a space
reopens where you left off.

## Routes

Everything lives under `/spaces`:

```
/spaces                                space list
/spaces/$spaceSlug                     → redirects to the space's last-used mode
/spaces/$spaceSlug/talk                Talk mode
/spaces/$spaceSlug/notes               Notes mode (redirects to the open/first note)
/spaces/$spaceSlug/notes/$noteSlug     a specific note
(reserved: /spaces/$spaceSlug/agent)
```

Slugs are **id-free** — `/spaces/school-homework-help`, not
`…-<uuid>`. `entitySlug(title)` just slugifies the title; resolving a slug
back to an entity happens reactively against the loaded collection via
`useSpaceIdFromSlug` / `useNoteIdFromSlug` (which fall back to a legacy UUID
suffix so old links still resolve). Because resolution needs data that hydrates
asynchronously, the mode routes show a brief `LoadingState` until the slug
resolves and redirect to `/spaces` if it never matches.

The `$spaceSlug` layout (`routes/_app/spaces/$spaceSlug/route.tsx`) wraps the
editor, speech, and chat-panel providers **once** for all modes. The
`$spaceSlug` index route has no UI: its `beforeLoad` reads
`lastSpaceMode(spaceSlug)` and redirects — last-mode memory is keyed by the URL
**slug**, not the id, so the redirect needs no data lookup. `SpacePageInner`
renders both Talk and Notes and calls `rememberSpaceMode(spaceSlug, mode)` on
mount/mode change (localStorage key `september:space-mode:<slug>`, default
`talk`).

Legacy `/talk`, `/talk/$spaceSlug`, `/notes/$spaceSlug`, and
`/notes/$spaceSlug/$noteSlug` are permanent `beforeLoad` redirects into the new
tree (mappers in `routes/_app/spaces/-redirects.ts`). The global `/notes` list
still works but is no longer in the sidebar. `routeForSpaceMode(mode)` is the
single source of truth for the talk/notes route strings.

## The bottom dock

`SpaceDock` (`components/nav/space-dock.tsx`) is one border-topped row present
in every mode, flush to the inset card's bottom edge. Space tabs sit on the
left (rounded-full pills, ≥44px; overflow collapses to a dropdown via a
`ResizeObserver`) and the mode group sits on the right, with a deliberate gap
between the two groups. Selecting a space navigates to `/spaces/$spaceSlug` so
it opens in that space's remembered mode.

`ModeGroup` (`components/nav/mode-group.tsx`) is a data-driven `tablist` with
roving tabindex — arrow keys move focus, Enter/Space/click activate. It takes
`ModeOption[]`, so a third mode (Agent) slots in without code changes. The
space title in the header stays quiet — no mode toggle there.

## The working-set slot

The strip directly above the composer input holds the mode's working set:
pinned phrase rows in Talk (from `Suggestions`), the `NoteTabs` strip in Notes.
`NoteTabs` (`@/packages/notes`) renders a tab per note and navigates to
`/spaces/$spaceSlug/notes/$noteSlug` on selection; when the tabs no longer fit
it collapses to an "All notes" list. Its first tab is **About** — the space's
context, editable as a note in the full editor (`SpaceAbout`,
`routes/_app/spaces/-space-about.tsx`) rather than buried in the right panel.
The About surface is bound to `space.context` (still the field `use-stripes`
reads to seed suggestions), so editing it feeds Talk. It carries the same
composer console as a real note — the `NoteTabs` strip, suggestions, and the
composer input — with the input appending to `space.context` (button reads "Add
to About"); only its storage target differs from a note. Per-note actions
(voice-over, download, reel) live in the notes editor header as `NoteActions`,
visible exactly when the note is.

## The right rail

`PanelRail` (`components/chat/right-panel.tsx`) is an always-present ~3.5rem
icon rail on the right (desktop only): **Phrases · Voice · divider · Display**.
Phrases and Voice are tabs that expand a fixed 320px tool card; the three
settings tabs (Provider/Voice/Speech) collapse into one **Voice** tab
(`SpeechSettings` renders all three sections under its own tab bar). Display is
an action, not a tab. History left the panel for the Talk transcript (the
compose column pages your spoken messages newest-first, `TRANSCRIPT_PAGE_SIZE`
per page, via `historyPage`); **Context** left it for the About note. Tapping a
tab expands its card; tapping the active tab, the collapse button, or `Esc`
returns to the rail; `⌘/Ctrl-.` toggles it. State (`rail` | `expanded` +
`activeTab`) persists to `september:chat-panel` via `useChatPanel`, migrating
the legacy `{ open, widthPct }` shape and mapping retired tabs
(`provider`/`speech` → `voice`, `history`/`context` → `phrases`). On mobile the
rail is hidden and the expanded card is a full-screen overlay opened from
`MobileNav`.

## The desktop app

The desktop dock follows this concept: the space tabs on the left, the Talk and
Notes switch on the right, with a wide gap between the two groups. The tabs
collapse to a list when the row is full, measured by overflow, not by a count.

The plus of the dock, and the plus of the space list, both open `/spaces/new`.
No space exists at that address. The screen asks what the space is for, and the
words of the user become the note of the new space. It is a Talk screen with no
transcript, and it writes through the same `Composer` as every mode, so the
screen that asks for the most typing is not the one screen without the word
tiles. A model writes the title and puts its own note under those words, after
a blank line. A second model writes the first phrases from the same words, and
the two run together. The screen waits for all three writes, so the space opens
with a full stripe. A space that the user skips opens at once, waits for no
model, and takes a name of three words, such as `Amber Cedar Meadow`.

While the models run, the three steps are drawn where the transcript would be,
in a `role="status"` region, and Cancel stays live throughout. A step that
cannot run says why.

The app never opens on this address. The words are kept in the
`new-space-draft` setting and offered back on the next visit: the app refuses
to open on a form, which is not the same as losing what was typed into it.

The desktop app has no per-mode working-set slot in Talk. The note tabs sit
above the dock in Notes mode, and the first of them is About, which opens the
note of the space.

The mode of each space is kept by slug, in the `space-modes` setting, so the
space list opens each space the way the user left it. The desktop app keeps
this in SQLite, not in the browser storage.

The right rail holds two tabs, Phrases and Voice, and expands to a 320px card.
The Voice card holds two questions only: which ElevenLabs model, and the three
sliders. Both are heard in the next sentence. It repeats the model question
that the ElevenLabs key screen asks, because a message sounds like the model as
much as the voice. Who speaks and which voice are not in the card: a service is
chosen once, and an account holds a hundred voices, each one to be heard before
it is taken, so both stay on `/voice` with the cloning. `Display` is not on the
desktop rail: the desktop app has no display window.

The tabs and the saved state are rules, in `src/rules/panel.ts`: `PANEL_TABS`,
and `panelStateFrom`, which reads the plain boolean the `panel-open` setting
held while Phrases was the only tab. The rail is
`apps/desktop/src/blocks/space-panel.tsx`.
