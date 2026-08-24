---
title: Tauri desktop implementation notes
plan: ../plans/2026-08-18-tauri-sqlite-desktop.md
---

# Tauri desktop implementation notes

- The repository has no `apps/web/README.md`; the root README and affected package READMEs are the existing documentation surfaces.
- The Rust outbox includes only cloud-synced domain collections. Audio aliases, autocomplete snapshots, and analytics events remain local.
- Audio APIs keep their existing logical paths. Desktop aliases map each path to an opaque Rust file ID in SQLite.
- The desktop CSP permits HTTPS and WSS connections because users can configure remote providers. It does not permit remote scripts.
- Desktop builds replace local model modules at build time. This keeps WebLLM, Whisper, Transformers, and Kokoro out of desktop bundles.
- Desktop exports use a Rust-owned native save dialog. The command accepts raw bytes and a suggested filename, but no destination path.
- The sync session, display profile, and audio-output preference use Rust settings commands on desktop.
- Temporary presentation and panel state remains in webview storage because it is not application record data.
- The macOS bundle declares microphone and camera privacy reasons for the existing recording and display features.
- Desktop display and presentation surfaces use named Tauri windows. Chat display messages use targeted Tauri events instead of `BroadcastChannel`.
- The local macOS bundle is not distribution-signed because this repository has no Apple signing identity. The packaged app launches locally; signing and notarization remain release configuration.
