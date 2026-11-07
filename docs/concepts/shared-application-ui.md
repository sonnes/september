---
title: Shared application UI
description: Web and desktop render one set of rules, tokens, primitives, layouts, blocks, and screens while platform services stay inside each app.
package: core, ui, app-ui, desktop, web
---

# Shared application UI

The browser and Tauri editions show the same application interface. A screen
change has one source, while persistence, secrets, speech, and native media
remain platform-specific.

The root pnpm workspace has three boundaries:

- `@september/core` owns pure interaction rules and autocomplete. It cannot
  import React or platform APIs.
- `@september/ui` owns the Tailwind theme and generic React primitives. It
  cannot import September screens or app services.
- `@september/app-ui` owns September layouts, blocks, application screens,
  and the services that both apps share. It uses the other two packages and
  one platform object.

Each app keeps its route bootstrap. Web also keeps its landing page. Both route
trees import the same components from `@september/app-ui`.

## The Platform

`packages/app-ui/platform.ts` holds the `Platform` interface: `store`, `voice`,
`providers`, `writing`, `device`, `capabilities`, and `app`. It holds only the
work that is different on the browser and on the Mac. Each app exports one
`platform` from its `src/platform.ts`, typed as `Platform`. Shared code imports
it from `@platform/adapter`, which TypeScript and Vite map to that file.

The shared services in `packages/app-ui/services/` hold everything else, one
time: the held settings, speech, the data hooks, the writing service, usage,
backup, export, and cloning. The `packages/app-ui` tests run them once against
an in-memory platform.

An optional member of the interface is a capability. It is absent where the
platform cannot do the work, for example `writing.apple` in the browser and
`device.renderVideo` on the Mac. The flags in `capabilities` decide which pages
and settings sections the navigation shows.

The Data settings screen uses the same boundary. `services/backup.ts` reads
and replaces data through `platform.store`, which uses IndexedDB in the
browser and typed Tauri commands on the Mac. The screen owns file selection,
preview, and confirmation. The store owns persistence.

Use neutral copy when an interaction is the same. If a capability differs,
keep the control in the same location and show its availability. Do not fork
the screen to explain a platform difference.

## Styling

`@september/ui/theme.css` is the only token source. Each app keeps a short CSS
entry point that imports the theme and registers the shared source directories
with Tailwind. Neither app keeps a copied primitive or token override.

## Screen size

Shared layouts carry their own responsive shape, because the same component
renders in a browser tab, on a phone, and in a Tauri window. Both indigo
panels move at the same width, the `md` breakpoint (768px) named in
`DESIGN.md`:

- The app shell keeps its sidebar down to `md` and becomes a sheet below it.
- The setup shell keeps its sidebar down to `md` and becomes a bar across the
  top below it. The bar drops the pitch and the step labels, keeps the brand
  mark, the numbered steps, and Help, and hands the rest of the screen to the
  step.

The setup progress list is one `<ol>` in both shapes — it lies on its side in
the bar and stands up in the sidebar. It is never rendered twice with one copy
hidden, so a screen reader hears the run of steps once. Every step keeps its
label as its name when the bar hides the visible label. A finished step adds
", completed". The current step is a `<span aria-current="step">`, not a link.

The narrowest screen a step is laid out for is 320px. A measurement that would
overflow it — a fixed sidebar width, a `min-w-64` field, a 70px panel indent, a
two-column summary row — carries a breakpoint prefix instead of applying
everywhere.

Welcome includes the Terms & privacy summary in both apps, before
personal details or service connections. Its full-policy controls open the
website through `platform.device.openInBrowser`, so the setup answers remain in memory.
The progress bar scrolls horizontally on narrow screens to keep each step
reachable at its full target size.

## Change workflow

Change a pure rule in `packages/core`, a generic control or token in
`packages/ui`, and an application interaction in `packages/app-ui`. Change an
app only when the route bootstrap or the platform differs. Run both app
builds after a shared UI change, so both platforms are type-checked against
the interface.
