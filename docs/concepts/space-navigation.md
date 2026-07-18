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

The `$spaceSlug` layout (`routes/_app/spaces/$spaceSlug/route.tsx`) wraps the
editor, speech, and chat-panel providers **once** for all modes. The
`$spaceSlug` index route has no UI: its `beforeLoad` reads `lastSpaceMode(id)`
and redirects. `SpacePageInner` renders both Talk and Notes and calls
`rememberSpaceMode(spaceId, mode)` on mount/mode change (localStorage key
`september:space-mode:<id>`, default `talk`).

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
reads to seed suggestions), so editing it feeds Talk. Per-note actions
(voice-over, download, reel) live in the notes editor header as `NoteActions`,
visible exactly when the note is.

## The right rail

`PanelRail` (`components/chat/right-panel.tsx`) is an always-present ~3.5rem
icon rail on the right (desktop only): **History · Phrases · Voice · divider ·
Display**. The three settings tabs (Provider/Voice/Speech) collapse into one
**Voice** tab (`SpeechSettings` renders all three sections under its own tab
bar); **Context** left the panel for the About note. Tapping a tab expands a
fixed 320px tool card; tapping the active tab, the collapse button, or `Esc`
returns to the rail; `⌘/Ctrl-.` toggles it. State (`rail` | `expanded` +
`activeTab`) persists to `september:chat-panel` via `useChatPanel`, migrating
the legacy `{ open, widthPct }` shape and mapping retired tabs
(`provider`/`speech` → `voice`, `context` → `history`). On mobile the rail is
hidden and the expanded card is a full-screen overlay opened from `MobileNav`.
