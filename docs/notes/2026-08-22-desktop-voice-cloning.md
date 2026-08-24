---
title: Desktop voice cloning implementation notes
plan: ../plans/2026-08-22-desktop-voice-cloning.md
---

- The provider work already centralizes Keychain values in `ProviderKeys`.
  Cloning uses that process cache instead of reading the Keychain again for
  each request.
- WKWebView can record `audio/mp4` where the web implementation expects WebM.
  Recorded files therefore keep the MIME type chosen by `MediaRecorder` and
  use a matching filename extension.
- A provider refresh can briefly omit a voice just after creation. The Voice
  screen keeps the new row as an optimistic entry until later refreshes include
  it.
- After the first implementation, the user replaced the right-hand sheet with
  a dedicated `/voice/clone` page. A successful clone replaces that history
  entry with `/voice`, so Back does not reopen an empty completed form.
- Review restored lazy apfel startup and health-based recovery. Voice cloning
  does not need the local writing sidecar, so it must not add that work to every
  application start.
- The 100 MB limit applies to the encoded multipart request, not only the sum of
  its files. The UI checks the exact byte length before raw IPC.
