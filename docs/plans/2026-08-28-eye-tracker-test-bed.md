---
title: Eye-tracker test bed
description: Replace global eye control and diagnostics with one camera-box pointer test at /eyetracker.
date: 2026-08-28
package: desktop
status: approved
---

# Eye-tracker test bed

The user approved this plan by asking for the simpler page directly.

1. Add a `/eyetracker` desktop route and sidebar destination.
2. Show one face-cropped camera-feed box with an explicit start and stop control.
3. Calibrate four targets inside the box and map the smoothed pupil position.
4. Clip the virtual pointer to the box and never activate application controls.
5. Keep the global pointer, diagnostic overlay, and log removed.
6. Keep camera frames and calibration in memory only and clear them on stop.
