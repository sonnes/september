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

Use neutral copy when an interaction is the same. If a capability differs,
keep the control in the same location and show its availability. Do not fork
the screen to explain a platform difference.

## Styling

`@september/ui/theme.css` is the only token source. Each app keeps a short CSS
entry point that imports the theme and registers the shared source directories
with Tailwind. Neither app keeps a copied primitive or token override.

## Change workflow

Change a pure rule in `packages/core`, a generic control or token in
`packages/ui`, and an application interaction in `packages/app-ui`. Change an
app only when the route bootstrap or platform service differs. Run both app
builds after a shared UI change so both platform facades are type-checked.
