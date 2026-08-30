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
- `@september/app-ui` owns September layouts, blocks, and application screens.
  It uses the other two packages and a platform facade.

Each app keeps its route bootstrap. Web also keeps its landing page. Both route
trees import the same components from `@september/app-ui`.

## Platform facade

Shared screens import platform work through `@platform/*`. TypeScript, Vite,
and the web test runner map that prefix to the active app's `src/` directory.

For example, `@platform/services/data` resolves to the IndexedDB hooks during a
web build and to the Tauri/SQLite hooks during a desktop build. Both modules
must expose the surface that the shared screen imports. Building both apps is
the contract check.

The Data settings screen uses the same boundary. Its
`@platform/services/backup` module reads and replaces data through IndexedDB in
the browser and through typed Tauri commands on desktop. The screen owns file
selection, preview, and confirmation. The platform service owns persistence.

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
hidden, so a screen reader hears the run of steps once, and every step link
keeps its full name (`Step 2: About you, current`) when the bar hides the
visible label.

The narrowest screen a step is laid out for is 320px. A measurement that would
overflow it — a fixed sidebar width, a `min-w-64` field, a 70px panel indent, a
two-column summary row — carries a breakpoint prefix instead of applying
everywhere. `apps/web/src/onboarding-responsive.test.tsx` reads that contract
off the rendered tree.

## Change workflow

Change a pure rule in `packages/core`, a generic control or token in
`packages/ui`, and an application interaction in `packages/app-ui`. Change an
app only when the route bootstrap or platform service differs. Run both app
builds after a shared UI change so both platform facades are type-checked.
