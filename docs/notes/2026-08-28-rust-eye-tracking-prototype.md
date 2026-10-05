---
title: Rust eye-tracking prototype notes
description: Decisions made while implementing the eye-tracking prototype.
plan: ../plans/2026-08-28-rust-eye-tracking-prototype.md
package: desktop
---

# Rust eye-tracking prototype notes

- The prototype recalibrates on each start. Persistence and display identity
  were deliberately deferred because the plan does not specify their product
  behavior.
- The UI discovers native semantic controls instead of adding a target registry
  to the shared application package. This keeps the experiment desktop-only;
  a product version still needs the registry proposed by the research.
- `cidre` supplies the AVFoundation, Vision, and dispatch bindings. Its delegate
  macro expands to one reference-to-pointer transmute, so that generated item
  has a local Clippy allowance; handwritten unsafe code remains checked.
- The calibration fits one linear mapping per axis from four points. The
  nine-point quadratic model remains a follow-up only if real target trials
  show that this smaller mapping is insufficient.
- Native framework compilation and automated rules are verified. Camera
  accuracy and permission flow still require an explicit hardware trial by the
  user; the implementation does not turn on the camera during automated tests.
