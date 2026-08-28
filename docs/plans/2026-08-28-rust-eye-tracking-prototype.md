---
title: Rust eye-tracking prototype
description: Prove that Apple Vision pupil landmarks can drive a calibrated, target-aware pointer inside the September desktop app.
date: 2026-08-28
package: desktop
status: superseded
---

# Rust eye-tracking prototype

Superseded by the
[`eye-tracker test bed`](2026-08-28-eye-tracker-test-bed.md).

The user approved the prototype by asking to build it after reviewing the eye-
tracking research.

1. Add a macOS Rust capture loop with AVFoundation and Apple Vision.
2. Keep camera frames and pupil coordinates native; stream only calibrated
   normalized points through a Tauri channel.
3. Calibrate four screen points each time eye control starts.
4. Draw one desktop-only pointer and dwell on visible semantic controls.
5. Stop capture when eye control stops or September exits.

This prototype does not move the macOS cursor, persist biometric data, support
multiple displays, or expose production settings.
