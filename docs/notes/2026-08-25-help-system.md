---
title: Build the September help system — implementation notes
description: Decisions made where the approved plan was silent, deviations, and reviewer notes.
plan: ../plans/2026-08-25-help-system.md
---

# Build the September help system — implementation notes

Only decisions and deviations not already stated in the plan belong here.

- Help needs the normal application shell before setup. Both routers now put
  `AppShell` on an unguarded shell route, with Help beside the guarded
  application route. Every non-Help application screen remains protected.
- Onboarding opens the setup guide in a sheet. This keeps its in-memory draft
  mounted while the reader checks the instructions.
- The Talk overview is the first shipped visual. It was captured at the
  1376×1032 baseline with a local demonstration profile, and the same asset is
  kept in each app's public directory so the shared catalog can use one URL.
- No support destination exists in the repository. The final guide explains
  what details to collect without inventing an email address or external
  support channel.
- The browser-control plugins could not initialize because their runtime
  imported a blocked Node module. Visual QA and the Talk screenshot used a
  fresh headless Chrome profile against the local Vite server instead.
- Help is prerendered. Because the guides come from pure rules and sit outside
  the setup guard, the web build now draws `/help` and every guide into its own
  file alongside the landing page. The reader who arrives from a search engine
  gets the steps without the bundle. This widened
  `docs/concepts/prerendered-pages.md` from the landing page to a list, and it
  needed a trailing-slash decision on both hosts — the Worker's asset default
  would have put a 307 in front of every Help URL.
- The prerendered Help page draws with the sidebar open, because `AppShell`
  measures the window in an effect that a build does not run. On a narrow
  screen it collapses to the rail on the first commit. Accepted: the words are
  right the whole time.
