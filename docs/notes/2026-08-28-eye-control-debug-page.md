---
title: Eye-control debug page notes
description: Decisions made while implementing the eye-control diagnostic surface.
plan: ../plans/2026-08-28-eye-control-debug-page.md
package: desktop
---

# Eye-control debug page notes

- The eye-control button links to the route because a Tauri window has no
  address bar. The route still stays out of the sidebar and restart allowlist.
- The native loop requests BGRA output and performs nearest-neighbor
  downsampling to 320 pixels wide. This avoids a second camera session and an
  image-codec dependency on a diagnostic-only path.
- Preview events run at five frames per second while Vision analysis keeps its
  existing 15-frame-per-second limit. This keeps the diagnostic channel useful
  without making its rendering work part of pointer latency.
- The event log is derived from typed channel events in the WebView. It keeps
  120 rows in memory and contains only tracker state and numeric measurements.
- Automated tests cover conversion, event field names, route isolation, log
  bounds, cleanup wiring, and builds. The camera feed and overlay alignment
  still require the explicit hardware trial from the original prototype notes.
