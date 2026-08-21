---
title: Desktop startup implementation notes
plan: ../plans/2026-08-18-desktop-startup.md
---

# Desktop startup implementation notes

- The splash screen has no timer. It stays visible only while the account and route settings load.
- The route setting uses an allowlist of app pages. Secondary windows cannot replace the main startup route.
- Rust uses the OS login name as the local record ID. It uses the OS real name as the initial profile name.
- The browser identity order does not change. A sync user still takes priority over the browser guest.
- The desktop app now comes back where it was, as the web app does. The router
  keeps each arrival in the `lastPath` setting, and `/` reads it through
  `openingPath` in `src/app-nav.ts`.
- `openingPath` is an allowlist of the `APP_NAV` paths and their children, to
  match the rule above. A setup step, an empty setting, and an unknown address
  all open `/dashboard`.
- The setting is read at the top of `src/os.ts`, before React mounts. An async
  guard would paint the dashboard first, and then move.
