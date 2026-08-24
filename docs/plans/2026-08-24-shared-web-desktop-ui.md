---
title: Share the web and desktop application UI
description: Move common rules, design primitives, screens, and route construction into root workspace packages while each app keeps its platform adapters.
status: completed
---

# Share the web and desktop application UI

The browser and Tauri apps will render one application interface. A root pnpm
workspace will own common packages, while each app will keep the code that
talks to its platform.

The existing browser port remains the baseline. This change replaces its copied
application source with imports from common packages.

## Package boundaries

Create three private workspace packages:

| Package | Owns | Must not own |
| ------- | ---- | ------------ |
| `@september/core` | Pure rules and autocomplete | React, browser APIs, Tauri APIs |
| `@september/ui` | Design tokens and generic React primitives | September screens or platform services |
| `@september/app-ui` | Application layouts, blocks, pages, and common routes | IndexedDB, SQLite, Keychain, or native commands |

Both applications depend on these packages with `workspace:*`. The workspace
uses one root lockfile and one set of shared dependency versions.

## Platform boundary

The common application UI imports a stable platform facade. Each application
maps that facade to its local rules and services during its build.

The web facade uses IndexedDB and browser APIs. The desktop facade uses Tauri,
SQLite, the macOS Keychain, and native media commands. Both implementations
must expose the same TypeScript surface, and both application builds verify
that contract.

Platform-specific copy and capabilities stay behind the facade. Shared screens
use neutral copy when the interaction is the same and capability state when a
feature is unavailable.

## Styling

`@september/ui` owns the Tailwind theme, design tokens, and shadcn primitives.
Each app keeps a small stylesheet entry point that imports the common theme and
registers the common package sources with Tailwind.

Intentional differences require an explicit capability or variant. An app must
not keep a copied primitive or token override.

## Test-first sequence

1. Add a failing workspace contract test.
2. Create the root workspace and common package manifests.
3. Add failing imports for the pure rules and autocomplete package, then move
   their tests and implementation.
4. Add a failing common-primitive import, then move the canonical UI and theme.
5. Add a failing common-screen import, then move layouts, blocks, and pages.
6. Point both route trees at the common screens and extract their common route
   construction.
7. Replace source-copy tests with package and platform-contract tests.
8. Update contributor documentation and run every web and desktop check.

## Acceptance

- Web and desktop import the same rules, autocomplete engine, primitives,
  layouts, blocks, and application pages.
- Only the platform facade, bootstrap, browser landing page, and native backend
  remain app-specific.
- A design-token or application-screen change has one source file.
- Both apps type-check and build from the same root lockfile.
- Web tests and lint pass.
- Desktop UI tests and Rust checks pass.
