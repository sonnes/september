---
title: Space-first navigation — implementation notes
plan: docs/plans/2026-07-17-space-nav-implementation.md
---

# Implementation notes

Running record of decisions the plan left open and deviations. Does not
restate the plan.

## Phase 1 — Route restructure

- **Note route nesting.** The plan wrote `$spaceSlug/notes.$noteSlug.tsx`,
  which under TanStack flat routing would nest `notes/$noteSlug` under
  `notes.tsx` and require an `<Outlet/>` in `notes.tsx`. To keep both
  `/spaces/$spaceSlug/notes` and `/spaces/$spaceSlug/notes/$noteSlug` as
  independent leaves under the single `route.tsx` layout, the note route is
  named `notes_.$noteSlug.tsx` (the `_` suffix opts out of nesting). Same
  URL, no phantom layout.
- **Providers wrapped once** in `spaces/$spaceSlug/route.tsx`
  (`EditorProvider > SpeechProvider > ChatPanelProvider > Outlet`). The old
  double-wrap (talk `route.tsx` + notes `-notes-page.tsx`) is gone.
- **`SpacePageInner` + subcomponents** moved to `spaces/-space-page.tsx`
  (pathless `-` file). `-space-mode.ts`, `-loading-skeleton.tsx` moved
  alongside.
- **Space-tab / space-list navigation targets** point at
  `/spaces/$spaceSlug` (the index redirect → last-used mode) rather than a
  hardcoded mode, so switching spaces preserves each space's remembered
  mode.
- **Old routes** become `beforeLoad` redirect stubs; redirect param mappers
  live in `spaces/-redirects.ts` (pure, unit-tested).
- **Sidebar nav**: Talk→Spaces (`/spaces`), Notes entry dropped,
  Clone→Voice (label only; url stays `/clone`).

## Phase 2 — Bottom dock

- **`SpaceDock`** (`components/nav/space-dock.tsx`) owns space tabs (ported
  overflow-to-dropdown from `SpaceSwitch`, bumped to `min-h-11` rounded-full
  pills) + `＋ New` + a right-aligned `ModeGroup`.
- **`ModeGroup`** (`components/nav/mode-group.tsx`) is a data-driven
  `tablist` with roving tabindex — arrow keys move focus, Enter/Space/click
  activate. Takes `ModeOption[]` so Agent slots in later.
- **Dock placement**: rendered as the last child of the content column,
  wrapped in `-mx-2 -mb-2 md:-mx-4 md:-mb-4` so its `border-t` runs flush to
  the inset card edges despite the content padding.
- **Deferred**: the header `PanelRight` toggle stays until Phase 4 (the
  panel still uses `open`/`openOverview`/`close`); `SpaceSwitch` is now dead
  but kept until the Phase 6 cleanup sweep. Its test stays green meanwhile.
- Mobile mode switching now uses the always-visible dock `ModeGroup` (the
  old `md:hidden` ModeSwitch is gone).

## Phase 3 — Notes sub-dock + editor-header actions

- **`NoteActions`** (`packages/notes/components/note-actions.tsx`) holds the
  voice-over/download/reel logic lifted from the retired `SpaceNotesPanel`.
- **Reel popover, no new dependency.** The plan called for a Popover, but the
  repo has no popover primitive and `package.json`/lockfile are already dirty
  from unrelated work — so `NoteActions` uses a small dependency-free
  disclosure (absolute-positioned card, close on Esc / outside pointerdown)
  instead of adding `@radix-ui/react-popover`.
- **`NoteActions` lives inside `SpaceNotes`**, not the page — `SpaceNotes`
  already derives the selected note, so its editor-header row is
  `EditableNoteTitle + NoteActions`. The page just renders `SpaceNotes` +
  `NoteTabs` + composer.
- **`NoteTabs`** (`packages/notes/components/note-tabs.tsx`) is the notes
  working-set strip; it renders inside the composer console (above
  suggestions) only when the space has notes. Selection calls `onSelect(note)`
  → the page's existing `handleSelectedNoteIdChange` (which navigates).
- **Overflow**: measured (ResizeObserver) like the dock; when the tab row
  doesn't fit it collapses to an "All notes" list (title + last-updated) built
  with the same dependency-free disclosure.
- **`shouldShowSpaceSidePanel` removed**; the right panel now shows for both
  modes whenever `open` (the notes-specific `SpaceNotesPanel` block is gone).
  The talk panel's drag-resize stays until Phase 4.

## Phase 4 — Right panel → collapsible icon rail

- **`useChatPanel` state** is now `{ state: 'rail' | 'expanded', activeTab }`
  (tab always set, default `history`). `loadPanelState()` is exported and
  pure so migration is unit-tested: legacy `{ open, widthPct }` maps to
  `expanded`/`rail`; malformed JSON and unknown tabs fall back to
  `rail`/`history`. Actions: `expandTab`, `collapse` (keeps the tab), `toggle`.
  The provider owns the `⌘/Ctrl-.` toggle listener.
- **`PanelRail`** (exported from `right-panel.tsx`, replaces `ChatRightPanel`)
  renders the always-present `w-14` rail (History · Provider · Voice · Speech ·
  Context · Phrases · divider · Display) plus, when expanded, the `w-80` tool
  card (icon + title + `PanelRightClose` collapse button, then the existing tab
  bodies). The overview grid and breadcrumb `PanelHeader` are deleted.
- **Rail is desktop-only** (`hidden md:flex`); on mobile the expanded card is a
  full-screen overlay driven by the `MobileNav` buttons (`openTab`→`expandTab`).
- **Dropped from the page**: `onPanelResize` + drag handle, `widthPct` sizing,
  and the header `PanelRight` toggle (header is now just trigger · title). The
  `RightPanel` slot renders `PanelRail` unconditionally in both modes.
- **No `components/chat/README.md`** — per app convention only `packages/*`
  carry READMEs, so none was created.

## Phase 5 — Composer restyle

- Input card: `border-2` colour swap → `border` + `shadow-sm` +
  `focus-within:ring-[3px] ring-ring/20`.
- Primary action (Speak / Add to note) switched from a raw button to the
  `Button` component (`size="lg" rounded-full px-6`, default indigo variant).
- Suggestion primitives and console wrapper left as-is.
- **Verified in the running app** (screenshots at 1376×1032 + 390-wide): dock,
  right rail (collapsed + expanded), notes strip + editor-header actions, reel
  popover, and mobile space-tab dropdown all render with no console/page
  errors; old `/talk` `/notes` deep links redirect; mode persists per space.
