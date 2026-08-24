---
title: Desktop usage tracking and dashboard implementation notes
plan: ../plans/2026-08-21-desktop-usage-dashboard.md
---

# Desktop usage tracking and dashboard implementation notes

- The implementation builds on the in-progress desktop source-layout reorganization already present in the worktree.
- Retention runs at startup and on usage reads and writes instead of using a background timer. This also covers an app that stays open until the next report or event.
- A cached ElevenLabs file records a free cached call with zero new credits. A playback failure does not turn successful synthesis into a failed provider call; the system fallback records a second event.
- CSV uses the WebView download path, which avoids adding a native file-dialog dependency.
