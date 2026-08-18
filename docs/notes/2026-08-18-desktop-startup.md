---
title: Desktop startup implementation notes
plan: ../plans/2026-08-18-desktop-startup.md
---

# Desktop startup implementation notes

- The splash screen has no timer. It stays visible only while the account and route settings load.
- The route setting uses an allowlist of app pages. Secondary windows cannot replace the main startup route.
- Rust uses the OS login name as the local record ID. It uses the OS real name as the initial profile name.
- The browser identity order does not change. A sync user still takes priority over the browser guest.
