---
title: Desktop voice cloning
description: Port the web voice-cloning workflow into the independent desktop Voice screen without exposing the ElevenLabs key to the WebView.
status: approved
---

# Desktop voice cloning

## Goal

Let a desktop user upload or record voice samples on a dedicated Voice
subpage, create an ElevenLabs voice, and start using it on the Voice screen.

## Scope

In scope:

- A dedicated cloning page at `/voice/clone`.
- Uploaded audio and guided microphone recordings.
- A native ElevenLabs cloning command that reads the key from Keychain.
- Automatic selection of the new voice and a refreshed account voice list.
- Inline validation, progress, errors, and recording cleanup.

Out of scope:

- Voice-cloning usage events and usage-report changes.
- Similar-voice search; the web cloning form does not call it.
- Persistent draft samples after the user leaves the Voice screen or quits.

## Boundary

React keeps the selected `File` objects for the life of the cloning page. On
submit, it builds the same multipart body as the web app and sends the encoded
bytes through raw Tauri IPC. Rust reads the ElevenLabs key from Keychain, adds
it to the fixed provider request, and forwards the body to
`/v1/voices/add`. The key never returns to React.

This needs no filesystem plugin, dialog plugin, base64 conversion, or local
sample schema.

## Test-first steps

1. Add Rust provider tests for the clone request, result, and provider errors.
2. Add and register the raw-body `provider_clone_voice` command.
3. Add TypeScript tests for multipart encoding, validation, recorder
   exclusivity, actual recording MIME types, and microphone cleanup.
4. Add the desktop cloning service and recording manager.
5. Add Voice-screen wiring tests, then add the cloning route and form.
6. On success, add the voice to the visible list, select ElevenLabs and the
   new voice, preserve the current model, refresh the provider list, and clear
   the samples, then return to `/voice`. Keep all form state after a failure.
7. Update the desktop UI README, backend README, and desktop-provider concept.
8. Run the desktop Node tests, UI build, Rust tests, Clippy, and formatter
   check.

## Accessibility

- Keep every standalone and icon action at least 44×44px.
- Keep errors inline and persistent instead of depending on a short toast.
- Keep the whole workflow keyboard- and switch-operable.
- Stop microphone tracks on stop, replacement recording, and cloning-page
  teardown.
- Revoke every object URL after playback, replacement, deletion, or teardown.
