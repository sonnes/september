---
title: Share the web and desktop application UI — implementation notes
description: Decisions, deviations, and reviewer notes for the shared workspace migration.
plan: ../plans/2026-08-24-shared-web-desktop-ui.md
---

# Share the web and desktop application UI — implementation notes

- The common application package uses a compile-time platform facade. This
  keeps hooks as ordinary module exports and avoids a mutable runtime service
  registry during React rendering.
- The earlier workspace removal fixed a TanStack Start build process that did
  not exit. The current web and desktop clients are plain Vite applications,
  so this workspace does not restore that build path.
- Route construction remains in each application. The web tree has a public
  landing page, while the desktop tree owns startup restoration and window
  titles. Both trees now import the same route components from
  `@september/app-ui`, and route-contract tests keep their application paths in
  sync.
- Shared screens use device-neutral copy. Virtual microphone and camera status
  stays in the same audio menu on both platforms; the browser adapters report
  those capabilities as unavailable.
- The workspace uses the root `pnpm-lock.yaml`. The former app lockfiles were
  removed after both applications built against the root resolution.
