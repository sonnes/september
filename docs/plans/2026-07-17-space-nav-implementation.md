# Space-first navigation — implementation plan

Status: ready for review
Exploration & decisions: `docs/plans/2026-07-17-space-first-nav.md`
Mocks: `2026-07-17-space-first-nav.html` (shell B) ·
`2026-07-17-mode-switching.html` (M2) · `2026-07-17-right-panel.html` (P2)

## Decisions being implemented

1. **Shell B** — indigo sidebar stays the icon rail; spaces are a bottom
   dock. Sidebar simplifies to global items.
2. **M2 dock split** — one bottom row: space tabs left, mode group
   (`Talk | Notes`, later `Agent`) right. Header loses the mode toggle and
   goes quiet.
3. **P2 sub-dock notes nav** — note tabs in a strip directly above the
   composer (the mode's "working-set" slot — phrase rows occupy it in
   Talk). Per-note actions (voice-over · download · reel) move to the
   editor header. `SpaceNotesPanel` (right-panel notes navigator) retires.
4. **Right panel → collapsible icon rail** — mirrors the left sidebar:
   always-present vertical icon rail (~3.5rem) that expands to a 320px
   card on tab select. Replaces open/closed + drag-resize + the overview
   card grid. Same panel in every mode.

**Out of scope:** Agent mode itself (surface, tools, receipts) — separate
plan. This plan only leaves room for it: mode group takes N modes, route
tree reserves `/spaces/$spaceSlug/agent`, working-set slot is per-mode.

## Current state (verified in code)

- Mode is URL-driven: `/talk/$spaceSlug` and `/notes/$spaceSlug[/$noteSlug]`
  both render `SpacePageInner` (`routes/_app/talk/$spaceSlug/index.tsx`,
  753 lines) with `mode: 'talk' | 'notes'`; `ModeSwitch` (defined inline
  there) navigates between them via `routeForSpaceMode`
  (`routes/_app/talk/-space-mode.ts`).
- Providers (`EditorProvider`, `SpeechProvider`) are wrapped twice: in
  `talk/$spaceSlug/route.tsx` and again in `notes/-notes-page.tsx`.
- `SpaceSwitch` (`packages/spaces/components/space-switch.tsx`) is the
  existing bottom space-tab row — lives *inside* the composer console,
  already collapses to a dropdown on overflow via ResizeObserver.
- Right panel: `ChatPanelProvider` (`components/chat/use-chat-panel.tsx`)
  persists `{open, widthPct}` to `september:chat-panel`; `ChatRightPanel`
  (`components/chat/right-panel.tsx`) shows an overview grid → tabs
  (history/provider/voice/speech/context/phrases + display action); in
  Notes mode the panel is instead `SpaceNotesPanel`
  (`packages/notes/components/space-notes.tsx`) with note cards +
  voice-over/download/reel buttons inside the selected card, drag-resized
  via `onPanelResize` in `index.tsx`.
- `SidebarLayout.RightPanel` (`components/sidebar/layout.tsx`) portals
  panels outside the inset as a sibling card — reused as-is.

## Target UX spec

### Layout (desktop ≥768px)

```
┌──────┬──────────────────────────────────────────────┬────┐
│ rail │ inset card                                   │rail│
│ (L,  │  header: space title · (nothing else)        │(R) │
│indigo│  content: mode surface                       │    │
│  )   │  composer: [working set][suggestions][input] │    │
│      │  dock: [space tabs · ＋]      [Talk | Notes] │    │
└──────┴──────────────────────────────────────────────┴────┘
```

- **Dock** (all modes): border-t, `bg-muted/40`, spaces left (pill tabs,
  ≥44px targets, overflow → dropdown, reusing the `SpaceSwitch`
  mechanism), mode group right (`role=tablist`), ≥24px gap between groups.
- **Working-set slot** (top of composer console, per mode): Talk = pinned
  phrase rows (unchanged, from `Suggestions`); Notes = note tabs strip.
- **Right rail**: vertical icons — History, Provider, Voice, Speech,
  Context, Phrases, divider, Display. Tap icon → panel expands to that
  tab (320px fixed). Tap active icon / collapse button / Esc → back to
  rail. No overview grid, no drag-resize, no header toggle button.
- **Header**: `EditableSpaceTitle` only (+ existing sidebar trigger).

### Compact / mobile

- ≤1376px (`useIsCompact`): both rails default collapsed (right rail has
  no expanded default anyway; persisted user choice wins within session).
- <768px: right rail hidden; existing `MobileNav` icon buttons open the
  panel as the existing full-screen overlay. Dock remains (spaces
  collapse to dropdown via existing mechanism; mode group stays).

### Keyboard & a11y

- `⌘/Ctrl-.` toggles right panel expand/collapse (left keeps `⌘B`).
- Esc: expanded panel → rail (replaces today's tab → overview → close).
- All dock/rail/strip targets ≥44px effective; focus rings per system
  (`focus-visible:ring`); `aria-selected`/`aria-pressed` on tabs; no
  hover-only affordances.

### Routes

```
/spaces                              space list (was /talk)
/spaces/$spaceSlug                   → redirect to last-used mode (default talk)
/spaces/$spaceSlug/talk
/spaces/$spaceSlug/notes             → redirect to last-open/first note
/spaces/$spaceSlug/notes/$noteSlug
(reserved: /spaces/$spaceSlug/agent)

Redirects (permanent, in-router):
/talk                 → /spaces
/talk/$spaceSlug      → /spaces/$spaceSlug/talk
/notes/$spaceSlug     → /spaces/$spaceSlug/notes
/notes/$spaceSlug/$noteSlug → /spaces/$spaceSlug/notes/$noteSlug
/notes                → keeps working (global notes list) but leaves the sidebar
```

Sidebar nav becomes: Home (`/dashboard`) · Spaces (`/spaces`) · Voice
(`/clone`, relabeled) · Help · Settings (+ Support/Feedback secondary).

## Phases

Each phase: write the listed tests first (red), implement (green),
then `pnpm -C apps/web lint && pnpm -C apps/web test && pnpm -C apps/web build`.
Update the running notes file `docs/notes/2026-07-17-space-nav-implementation.md`
(create at start) with decisions the plan doesn't cover.

---

### Phase 1 — Route restructure to `/spaces` + last-mode memory

**Tests first**
- Extend `routes/_app/talk/-space-mode.test.ts` (moves with its module):
  `routeForSpaceMode('talk'|'notes')` → new `/spaces/...` paths; new
  helpers `lastSpaceMode(spaceId)` / `rememberSpaceMode(spaceId, mode)`
  (localStorage `september:space-mode:<id>`, default `'talk'`, ignores
  unknown values).
- New test for redirect helpers (pure functions mapping old params → new
  `to`/`params`).

**Changes**
- New `routes/_app/spaces/` tree:
  - `index.tsx` — space list (move content of `talk/index.tsx`; loading
    skeleton `-loading-skeleton.tsx` moves along).
  - `$spaceSlug/route.tsx` — providers (`EditorProvider`,
    `SpeechProvider`) wrapped **once**; kills the duplicate wrapping in
    `notes/-notes-page.tsx`.
  - `$spaceSlug/index.tsx` — `beforeLoad` redirect to
    `routeForSpaceMode(lastSpaceMode(id))`.
  - `$spaceSlug/talk.tsx` — renders `SpacePageInner mode="talk"`.
  - `$spaceSlug/notes.tsx` + `$spaceSlug/notes.$noteSlug.tsx` — renders
    `SpacePageInner mode="notes"` (logic from `notes/-notes-page.tsx`,
    including canonical-slug redirect via `isNotesRouteCanonical`).
- `-space-mode.ts` and `SpacePageInner` move under `routes/_app/spaces/`
  (mechanical move; `SpaceMode` union stays `'talk' | 'notes'` — widening
  to `'agent'` happens in the agent plan).
- Old routes become thin redirect files (`beforeLoad` + `redirect()`):
  `talk/index.tsx`, `talk/$spaceSlug/*`, `notes/$spaceSlug.tsx`,
  `notes/$spaceSlug/$noteSlug.tsx`. `/notes` (global list) stays.
- `rememberSpaceMode` called from `SpacePageInner` on mount/mode change.
- Update all `navigate`/`Link` targets (full list from grep):
  `packages/spaces/components/space-switch.tsx` + `space-switch.test.tsx`,
  `packages/spaces/components/space-list.tsx`,
  `packages/onboarding/components/onboarding-provider.tsx` +
  `routes/_onboarding/onboarding.tsx` + `-onboarding.test.tsx` (post-setup
  redirect into the first space), `routes/_app/help.tsx`,
  `routes/_app/notes/index.tsx`, and `getNavigationData()`
  (`components/sidebar/app-sidebar.tsx`: Talk→Spaces `/spaces`, drop
  Notes, Clone→Voice) + `app-sidebar.test.ts`. `routeTree.gen.ts` is
  generated — never hand-edit.
- `pageTitle` metas: "Talk"/"Notes" stay per mode route.

**Verify**: old URLs redirect (manual: `/talk`, `/talk/<slug>`,
`/notes/<slug>/<note>`); space list loads at `/spaces`; mode persists
across reload.

---

### Phase 2 — Bottom dock (M2)

**Tests first**
- `components/nav/space-dock.test.tsx`: renders one tab per space +
  active state; renders mode tablist with `aria-selected`; mode change
  calls `onModeChange`; spaces overflow collapses to dropdown (port the
  ResizeObserver pattern/test from `space-switch`).
- `ModeGroup` unit test: arrow-key moves focus within tablist (roving
  tabindex), Enter/Space activates.

**Changes**
- New `components/nav/mode-group.tsx` — extract `ModeSwitch` out of
  `index.tsx`, generalized to `modes: {key, label, icon}[]` (data-driven
  so Agent slots in later), pill segmented style per mock, `min-h-11`.
- New `components/nav/space-dock.tsx` — full-width row: space tabs
  (extracted from `SpaceSwitch`; keep its overflow-to-dropdown mechanism;
  bump targets `h-8` → `h-11`, `rounded-full` pills) + `＋ New` +
  spacer + `ModeGroup`.
- `SpacePageInner`: remove `SpaceSwitch` from the composer console;
  render `SpaceDock` as the last child of the page column (below
  composer), all modes. Remove both `ModeSwitch` usages (header +
  mobile block).
- `packages/spaces/components/space-switch.tsx`: gut to re-export or
  delete once `SpaceDock` owns the behavior (its logic moves; update
  `packages/spaces/index.ts` exports and README).
- Header now: sidebar trigger · separator · `EditableSpaceTitle` only.

**Verify**: switch space and mode from the dock in both modes; overflow
with 8+ spaces collapses; mobile layout intact.

---

### Phase 3 — Notes sub-dock (P2) + editor-header actions

Includes **context-as-note**: the space's context stops being a panel
field and becomes a special "About" note — first tab in the sub-dock
(✦ icon), always present, not deletable, edited in the full editor, read
by the suggestion/phrase engine.

**Tests first**
- `packages/notes/types` / model: `NoteSchema` gains
  `kind: 'note' | 'context'` (default `'note'`); `useNotes` excludes
  context notes from normal lists; new `useContextNote(spaceId)` returns
  the space's context note, lazily creating an empty one.
- Migration test: a space with legacy `space.context` text gets it copied
  into a new context note on first load (one-time; `space.context` no
  longer read afterwards).
- Suggestion seeding reads context-note content where it read
  `space.context` (locate uses by grep in `packages/suggestions` /
  `packages/ai`; test the accessor, not the engine).
- `packages/notes/components/note-tabs.test.tsx`: About tab renders
  first with distinct affordance and no delete; then one tab per note,
  active tab from `selectedId`, click navigates (calls `onSelect` with
  note), `＋ New note` calls create, overflow (> fits) renders `…`
  dropdown with title + `timeAgo` rows.
- Editor: context note hides `NoteActions` (no voice-over/reel) and the
  rename affordance (fixed title "About this space").
- `packages/notes/components/note-actions.test.tsx`: voice-over button
  disabled with empty note text; play/stop toggle states; download
  disabled while preparing; reel button opens export popover. (Port
  assertions from `space-notes.test.tsx`.)

**Changes**
- New `packages/notes/components/note-tabs.tsx` — strip for the
  working-set slot: `NOTES` label + tab per note (icon + title,
  `min-h-11`, `aria-current`) + `＋ New note` + `…` overflow dropdown
  (previews). Selection navigates to
  `/spaces/$spaceSlug/notes/$noteSlug` via existing `notesRouteParams`.
- New `packages/notes/components/note-actions.tsx` — extract voice-over /
  download / reel logic from `SpaceNotesPanel` (`speak/stop`,
  `handleDownloadVoiceOver`, reel toggle). Reel options
  (`NoteReelExportPanel`) render in a `Popover` anchored to the Reel
  button instead of inline card expansion.
- `SpacePageInner` notes mode:
  - `notesColumn`: editor header row = `EditableNoteTitle` + `NoteActions`
    (right-aligned); `NoteTabs` renders at the top of the composer
    console (same slot phrase rows use in Talk).
  - Remove the desktop `SpaceNotesPanel` right-panel block and the
    `md:hidden` mobile block; remove `shouldShowSpaceSidePanel` and its
    test.
- Context note wiring: add `kind` to `NoteSchema` + collection default;
  `useContextNote` hook + lazy create + `space.context` one-time
  migration; point every `space.context` reader/writer at it —
  suggestions' `spaceMd` (`packages/suggestions/lib/context.ts` call
  sites), phrase seeding (`packages/spaces/lib/phrases.ts`,
  `use-generate-space-phrases.ts`, `use-sync-space-phrases.ts`), and the
  AI context generator (`use-generate-space-context.ts` — it now writes
  the About note); exclude `kind: 'context'` from `/notes` global list
  and note counts.
- Delete `SpaceNotesPanel` from `space-notes.tsx` once nothing imports
  it; `SpaceNotes` (editor) stays. Update `space-notes.test.tsx`,
  `packages/notes/index.ts`, `packages/notes/README.md`, and
  `docs/concepts/space-notes.md` ("note selector lives in the app right
  panel" → sub-dock + editor-header actions + About note).

**Verify**: create/switch/rename notes from the strip; voice-over,
download, reel export all work from the header; empty-space state (no
notes) shows the existing `EmptyState` with New note.

---

### Phase 4 — Right panel → collapsible icon rail

**Tests first**
- `components/chat/use-chat-panel.test.ts` (new): initial state `rail`
  with no storage; **migration** — legacy `{open: true, widthPct: 44}` →
  `{state: 'expanded', activeTab: null→'history'}`, `{open: false}` →
  `rail`; `expandTab('voice')` → expanded+tab; `collapse()` → rail keeps
  `activeTab` (so re-expand restores); `toggle()` flips; Esc handled by
  component test below.
- `components/chat/panel-rail.test.tsx`: renders 7 icon buttons with
  labels; clicking a tab expands and marks `aria-pressed`; clicking the
  active tab collapses; Esc collapses; Display icon calls
  `onOpenDisplay` and does not expand.

**Changes**
- `use-chat-panel.tsx`: state becomes
  `{state: 'rail' | 'expanded', activeTab: ChatPanelTab}` (tab always
  set; default `'history'`). Remove `widthPct`/`setWidthPct`/`clampWidth`,
  `openOverview`, `home`. Keep storage key, migrate legacy shape on load.
  Add `⌘/Ctrl-.` listener in the provider (toggle).
- `right-panel.tsx` rework (tab set per
  `docs/mocks/2026-07-17-right-panel-parts.html` — three tabs + one
  action, replacing today's seven):
  - New `PanelRail` — vertical card (`w-14`, `rounded-xl border
    shadow-sm`, matches inset margins `my-2 mr-2`): tab icons **History,
    Phrases, Voice**, divider, **Display** (action + status dot, opens a
    popover — not a tab). Neutral surface (white) — indigo stays the
    left sidebar's signature.
  - Expanded panel — fixed `w-80` card: header = icon + tab title +
    contextual action (＋ on Phrases) + collapse button
    (`PanelRightClose`). Delete `OverviewCard` grid and the breadcrumb
    `PanelHeader`.
  - **History** — day-grouped rows, newest at bottom; tap selects and
    reveals Replay / Insert / Copy; optional search. (Upgrades
    `HistoryTab`/`MessageList` usage.)
  - **Phrases** — `PhrasesTab` restructured: header ＋ add, Pinned group,
    Suggested group with Refresh; row tap = insert (existing behavior).
  - **Voice** — merges today's provider/voice/speech tabs into one:
    "Live" controls on top (speed, volume — output device is NOT here,
    it moves beside Speak in Phase 5), voice identity card with preview
    + "Change voice…" (provider becomes a filter inside the picker),
    "Tuning" collapsed row. Implemented as a new `variant="live"`
    composition over `SpeechSettings` internals rather than the
    `section` prop; `ChatPanelTab` union becomes
    `'history' | 'phrases' | 'voice'`.
  - No Space/Context tab: context is the About note (Phase 3); renaming
    stays in the header (`EditableSpaceTitle`); Delete space moves to
    the `/spaces` list page (confirm dialog) — verify `SpaceList`
    already offers it, add if not.
  - `MobileNav` header buttons reduce to the same three + display.
- `SpacePageInner`:
  - Render `<SidebarLayout.RightPanel><PanelRail…/></SidebarLayout.RightPanel>`
    unconditionally for both modes (desktop `md:` only).
  - Delete `onPanelResize`, the drag handle, `widthPct` styling, the
    header `PanelRight` toggle button, and the notes-mode conditional
    panel (already gone in Phase 3).
  - Mobile: `MobileNav` buttons keep calling `expandTab(tab)`; expanded
    panel keeps its existing full-screen fixed overlay classes at `<md`.
- `components/chat/README.md`: none exists — create brief module README
  (components/, per app convention this is optional; skip if convention
  says packages only — packages carry READMEs, `components/` does not).

**Verify**: rail visible in Talk and Notes; expand/collapse via icon,
collapse button, Esc, and `⌘.`; state survives reload (storage
migration from a pre-change profile); mobile overlay path still works.

---

### Phase 5 — Composer restyle (structure unchanged)

No behavior change — safe to land with visual review only, but keep the
existing component tests green.

- Input card: `rounded-2xl border bg-background shadow-sm` with
  `focus-within:border-ring focus-within:ring-[3px] ring-ring/20`
  (replaces `border-2` color swap).
- Primary action: `size="lg"` `rounded-full px-6` (≥44px), Speak keeps
  indigo `default` variant; "Add to note" likewise (icon differs, as
  today).
- Suggestion pills / phrase rows: keep `Suggestion` primitives; spacing
  per mock (`gap-2`, row `py-1`).
- `AudioOutputDeviceSelector` moves from the left tool rail to the right
  side of the input row, immediately left of Speak (talk mode only, as
  today) — quiet zinc pill styling so Speak stays the loud thing. It
  also leaves the Voice tab (never lands there).
- Console wrapper: `bg-muted/40 rounded-lg p-3` stays; dock sits outside
  it (from Phase 2), so drop the wrapper's bottom `SpaceSwitch` gap.

**Verify**: `/screenshot` pass at 1376×1032 + mobile; compare against
mocks; run `/verify` app drive (type → suggestions → speak; notes append).

---

### Phase 6 — Docs & cleanup sweep

- Update `docs/concepts/space-notes.md` (done in Phase 3), add
  `docs/concepts/space-navigation.md` — one concept doc for: space-first
  routes, dock (spaces + modes), working-set slot, right rail. Frontmatter
  `package: spaces`.
- `packages/spaces/README.md`, `packages/notes/README.md` — final pass.
- Delete dead code: `space-switch.tsx` (if fully replaced),
  `shouldShowSpaceSidePanel`, legacy redirect-only files kept.
- `docs/plans/2026-07-17-space-first-nav.md` — mark decided alternatives.
- Full suite: `pnpm -C apps/web lint && pnpm test && pnpm build`, then
  `/verify` end-to-end drive of: space create → talk → speak → notes →
  note create → voice-over → mode/space switching → panel expand/collapse
  → reload persistence → old-URL redirects.

## Risks & mitigations

- **`index.tsx` is a 753-line God file** — Phases 2–4 all edit it.
  Sequence strictly (2 → 3 → 4), extract components out rather than
  editing in place, keep each phase a separate commit.
- **Storage migration** (`september:chat-panel`): malformed/legacy shapes
  must fall back cleanly — covered by unit tests; never throw on load.
- **Route churn breaks deep links**: redirects are tested manually per
  the Phase 1 verify list; `display.$id` / `present.$id` don't reference
  talk/notes paths (verified by grep); onboarding's post-setup redirect
  does and is on the Phase 1 list.
- **Prerender/build**: new route files must not break the SPA prerender
  (`pnpm build` in every phase gate).
- **Losing drag-resize**: deliberate simplification (fixed 320px). If it
  turns out users relied on wide History reading, revisit with two fixed
  widths (320/480) rather than free drag.
- **Dock vertical cost on short viewports**: dock adds ~56px below the
  composer; check 1032px-height base viewport in Phase 2 screenshots —
  if tight, dock and composer paddings compress (`py-2`).

## Open questions (answer before or during Phase 1)

1. `/notes` global list: keep routable but out of the sidebar (planned) —
   or kill entirely?
2. Note-tab overflow threshold: measured (ResizeObserver, like
   `SpaceSwitch`) — agreed?
3. ~~Right-rail tab set~~ — decided: three tabs + Display action
   (History · Phrases · Voice), per `2026-07-17-right-panel-parts.html`.
   Context lives in the About note; output device beside Speak. Phrases
   retires into the Agent when it ships (rail: History · Voice +
   Display, no relayout).
5. Context-note details: does the About note sync back to
   `space.context` for export/backup compatibility, or is the column
   abandoned after migration? (Plan assumes abandoned — sync adds a
   write path for no current reader.)
4. `⌘.` for right panel — conflicts with nothing in-app today; fine?
