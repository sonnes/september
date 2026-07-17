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
