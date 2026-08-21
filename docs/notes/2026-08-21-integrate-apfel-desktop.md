---
title: Apfel desktop implementation notes
plan: ../plans/2026-08-21-integrate-apfel-desktop.md
---

# Apfel desktop implementation notes

- A separate Tauri configuration adds apfel only to Apple Silicon bundles.
  Other targets can still build the base application.
- The Tauri wrapper prepares the pinned binary before development or packaging.
  The generated binary stays outside Git.
- The bearer token uses `APFEL_TOKEN`. It does not appear in the process
  arguments.
- The WebView does not receive shell permissions or an apfel loopback URL.
- Rust reads the macOS product version before startup. Versions before 26
  report `supported: false` without starting apfel.
- The bundle includes the upstream MIT license with the sidecar.
