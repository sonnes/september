---
title: Desktop src layout
description: Notes from the move of apps/desktop/src into layouts, pages, and blocks.
plan: docs/plans/2026-08-21-desktop-src-layout.md
---

# Desktop src layout

## Deviations

**`blocks/composer.tsx` is `blocks/space.tsx`.** The plan named the file after
the composer. The file also holds the dock, the space title, and the audio
selector. The name `space` says what is in it.

**Three symbols are now exports.** `Problem`, `talkParams`, and
`RightPanelSlot` were private. Each one crossed a new file boundary:

- `Problem` and `talkParams` come from `blocks/space.tsx`. The Spaces page and
  the Talk page both use them.
- `RightPanelSlot` comes from `blocks/screen.tsx`. The app layout gives the
  slot, and `RightPanel` reads it. This direction keeps one-way imports: a
  layout imports a block, and a block never imports a layout.

## Decisions

**`rules/` imports a sibling with a relative path.** A node test loads a file
in `src/rules/` directly, and node does not resolve `@/`. `rules/notes.ts`
imports `./spaces.ts`. Every other import in the app uses the alias.

**`src/autocomplete/` does not move.** It is a copy of the engine in the web
app. A move would make the two apps differ for no gain.

**`src/usage.ts` and `src/usage-summary.ts` stay at the root.** They belong to
the usage-dashboard work, which is not committed. `usage.ts` goes in
`services/` and `usage-summary.ts` goes in `rules/` when that work lands.

**The `@/` alias, not `../`.** A file in `layouts/`, `pages/`, or `blocks/`
imports a root module as `@/os`, not `../os`. A later move of one file then
changes no import.

**No barrel file.** An `index.ts` that re-exports would hide the true path of
a symbol. The plan states this, and nothing during the move argued against it.

**`pages/steps.tsx` stays one file.** It holds five route components. They
share no part, so five files give no gain.

## Known dead code, left alone

The move made four unused symbols visible to `tsc --noUnusedLocals`. All four
predate this work, and none is in scope here:

| File | Symbol |
| --- | --- |
| `src/blocks/services.tsx` | `ReactNode`, `forgetProvider` |
| `src/pages/steps.tsx` | `connectProvider` |
| `src/pages/talk.tsx` | `speaking` in `Talk` |

## Old docs keep the old paths

A plan or a note in `docs/` from earlier work names `src/talk.tsx` and the
other old paths. Those files record what was true when they were written. Only
`apps/desktop/CLAUDE.md` and `apps/desktop/README.md` describe the app as it is
now, and both are current.
