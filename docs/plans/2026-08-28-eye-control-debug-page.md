---
title: Eye-control debug page
description: Add an opt-in desktop diagnostic route with a low-rate annotated camera preview and bounded in-memory tracking log.
date: 2026-08-28
package: desktop
status: superseded
---

# Eye-control debug page

Superseded by the
[`eye-tracker test bed`](2026-08-28-eye-tracker-test-bed.md).

The user approved this diagnostic surface by asking to build it after the eye-
control prototype.

1. Add a hidden `/debug/eye-control` desktop route outside normal navigation.
2. Start the existing native camera loop in an explicit debug mode from that
   page.
3. Send a low-rate, low-resolution preview with eye landmarks only in debug
   mode.
4. Draw the preview, face box, eye outlines, and pupils on one canvas.
5. Show current raw coordinates, confidence, state, and a bounded in-memory
   event log.
6. Stop the camera on request or when the page unmounts.

The page does not save previews or logs, show user-authored text, change the
macOS pointer, or appear in the product sidebar.
