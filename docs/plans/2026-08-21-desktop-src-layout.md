---
title: Desktop src layout
description: Divide apps/desktop/src into layouts, pages, and blocks.
status: done
---

# Desktop src layout

## Problem

`apps/desktop/src/` is flat. 55 files sit in one directory. A reader cannot
see which file draws a route, which file wraps a route, and which file is a
part that two routes share.

Two files hold more than one category:

- `talk.tsx` holds two pages and three shared parts. `notes-screen.tsx`
  imports the shared parts, so Notes pulls in the Spaces page.
- `shell.tsx` holds the app layout and four screen parts. Four pages import
  the parts. Only `main.tsx` imports the layout.
- `settings.tsx` holds the settings layout and its three child pages.

## Target

```
src/
├── layouts/          # wraps an <Outlet/>
│   ├── onboarding.tsx
│   ├── app.tsx
│   └── settings.tsx
├── pages/            # one route component for each file
│   ├── steps.tsx
│   ├── spaces.tsx
│   ├── talk.tsx
│   ├── notes.tsx
│   ├── voice.tsx
│   └── settings.tsx
├── blocks/           # a part that two or more pages or layouts use
│   ├── screen.tsx
│   ├── space.tsx
│   ├── services.tsx
│   ├── phrase-panel.tsx
│   ├── suggestions.tsx
│   └── brand.tsx
├── services/         # speaks to Rust, the platform, or a cloud service
│   └── os  data  ai  speech  player  phrase-sync  suggest
├── rules/            # no renderer, no backend; a node test imports it
│   └── app-nav  settings-nav  onboarding  spaces  notes  phrases  stripes  prompts
├── components/ui/    # no change (shadcn)
└── autocomplete/     # no change (a copy of the web engine)
```

## Rules

1. A file in `layouts/` renders an `<Outlet/>`. There are three.
2. A file in `pages/` is the component of a `createRoute` call in `main.tsx`.
3. A file in `blocks/` has two or more consumers. With one consumer, the part
   stays in the page.
4. A module in `services/` speaks to Rust, to the platform, or to a cloud
   service. A module in `rules/` speaks to none of them.
5. In `rules/`, import a sibling with a relative path. A node test loads the
   file directly, and node does not resolve `@/`.

## Moves

| From | To | Symbols |
| --- | --- | --- |
| `app.tsx` | `layouts/onboarding.tsx` | `OnboardingLayout`, `useDraft` |
| `shell.tsx` | `layouts/app.tsx` | `AppShell`, `AppSidebar`, `ICONS`, `useIsCompact` |
| `shell.tsx` | `blocks/screen.tsx` | `Screen`, `ScreenHeader`, `RightPanel`, `RightPanelSlot`, `AppScreen` |
| `settings.tsx` | `layouts/settings.tsx` | `SettingsLayout` |
| `settings.tsx` | `pages/settings.tsx` | `SetupSettings`, `WritingSettings`, `ConnectionScreen` |
| `talk.tsx` | `pages/spaces.tsx` | `SpacesScreen`, `Empty`, `DeleteSpaceDialog` |
| `talk.tsx` | `pages/talk.tsx` | `TalkScreen`, `Talk`, `Bubble`, `PageButton` |
| `talk.tsx` | `blocks/space.tsx` | `Composer`, `SpaceTitle`, `SpaceDock`, `AudioSelector`, `ModeGroup`, `Problem`, the route parameter helpers, `useRememberMode` |
| `notes-screen.tsx` | `pages/notes.tsx` | `NotesScreen` |
| `voice.tsx` | `pages/voice.tsx` | `VoiceScreen` |
| `steps.tsx` | `pages/steps.tsx` | the five setup steps |
| `services.tsx` | `blocks/services.tsx` | no change |
| `phrase-panel.tsx` | `blocks/phrase-panel.tsx` | no change |
| `suggestions.tsx` | `blocks/suggestions.tsx` | no change |
| `brand.tsx` | `blocks/brand.tsx` | no change |

`steps.tsx` stays one file. It holds five route components with no shared
part between them. Five files give no gain.

## Out of scope

- No `index.ts` barrel file. A barrel hides the true path of a symbol.
- No `features/` directory.
- No move of `src/autocomplete/`. It is a copy of the web engine.
- No move of `src/usage.ts` or `src/usage-summary.ts`. They belong to the
  usage-dashboard work, which is not committed.

## Steps

1. Change the path assertions in `tests/bootstrap.test.mjs` and
   `tests/settings.test.mjs` to the new paths. The tests fail.
2. Move the files that need no split, with `git mv`.
3. Divide `shell.tsx`, `settings.tsx`, and `talk.tsx`.
4. Correct each import.
5. Update `apps/desktop/CLAUDE.md`.
6. Operate `pnpm build` and `pnpm test`. Both must pass.
