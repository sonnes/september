---
title: Eye-tracker test bed notes
description: Decisions made while reducing eye control to an isolated camera-box test.
plan: ../plans/2026-08-28-eye-tracker-test-bed.md
package: desktop
---

# Eye-tracker test bed notes

- The sidebar entry is the only product-shell integration. Camera capture and
  the pointer still mount only on the Eye tracker page.
- Rust sends the feed and smoothed point together at five frames per second.
  This avoids a second event stream and keeps the point aligned with its frame.
- Vision's face box is padded to a normalized square, which preserves 16:9
  because the source and preview have the same aspect ratio. A low-pass filter
  keeps small face-box changes from making the preview jump.
- Four targets calibrate raw eye-relative coordinates to the box. Each target
  discards a short settling interval and uses the median of its samples. The
  fitted axes stay in WebView memory and clear when capture stops.
- Dwell activation and target resolution remain removed so calibration cannot
  activate an application control.
- The point and crop filters are the hardware tuning values. Accuracy still
  requires a camera trial.
