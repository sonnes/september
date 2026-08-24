---
title: Replace the web app with the desktop UI — implementation notes
description: Decisions made where the approved plan was silent, deviations, and reviewer notes.
plan: ../plans/2026-08-24-web-desktop-ui.md
---

# Replace the web app with the desktop UI — implementation notes

Only decisions and deviations not already stated in the plan belong here.

- The web app is now a plain Vite SPA. This keeps the manual route graph equal
  to the desktop graph and changes the build output from `dist/client` to
  `dist`.
- The autocomplete engine trains in memory. It learns from repository messages
  at each start and does not keep a second IndexedDB database.
- Apple Intelligence, the virtual microphone, and the virtual camera report an
  unavailable browser state. The controls remain in the desktop UI positions.
- Provider keys stay in IndexedDB and are readable by scripts on the browser
  origin. The web README states this difference from the desktop Keychain.
- ElevenLabs speech uses the same IndexedDB database for a 100 MiB cache. Files
  are split into 1 MiB chunks, and whole files leave in least-recently-used
  order before a write exceeds the limit.
- The browser keeps the original public landing page at `/` as an explicit
  exception to desktop route behavior. Its calls to action start the new setup
  flow at `/welcome`, and its demos use the new pure rules and browser speech
  instead of restoring retired packages or databases.
- Automated browser control could not start because the installed browser
  runtime rejected one of its own Node imports. Unit tests, lint, production
  build, and direct-route hosting checks remain the final verification path.
