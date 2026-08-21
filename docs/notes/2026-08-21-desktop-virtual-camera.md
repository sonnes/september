---
title: Desktop virtual camera implementation notes
plan: ../plans/2026-08-21-desktop-virtual-camera.md
---

# Implementation notes

- The camera extension owns capture and composition. The WebView sends only overlay state.
- The first stream format is 1280×720 BGRA at 30 frames per second.
- The host communicates through one custom Core Media I/O property, so video buffers never cross the Tauri boundary.
- The existing uncommitted notes, settings, and provider changes remain in place while this work touches shared files.
- The custom property removes the need to share frame files or an application-group container.
- Talk waits 80 milliseconds after a text change before it updates the extension.
- The extension remains installed when September quits. The Talk control owns explicit deactivation.
- The build script uses Xcode directly because the system extension is a separate signed bundle inside the Tauri app.
- Local builds omit signing when the Apple team or identity is absent. They verify compilation but cannot activate the extension.
- The bottom-left watermark reuses the published `public/logo.svg`. The extension loads and scales it once instead of redrawing the mark or rasterizing it for every frame.
