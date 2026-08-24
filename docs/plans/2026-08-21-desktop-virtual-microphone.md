---
title: Desktop virtual microphone
description: Publish September speech as a Core Audio input that calling apps can select.
package: desktop
---

# Desktop virtual microphone

## Goal

Let a user send September speech to FaceTime through a system audio input named
`September Microphone`.

## Plan

1. Add tests for the privacy message, the native commands, and the Talk audio selector.
2. Add a native macOS bridge for the Core Audio process tap and aggregate input.
3. Add native playback for the system voice and cached cloud voice files.
4. Expose microphone and playback operations through the desktop Tauri service boundary.
5. Add an opt-in control to the Talk audio selector and keep the current voice fallback.
6. Update the desktop READMEs and add a concept document.
7. Run the desktop tests, Rust checks, and production build.

## Behavior

- The microphone is off by default.
- The user starts and stops it from the Talk audio selector beside Speak.
- The device is public while September runs, so FaceTime can list it.
- September removes the device when the user stops it or quits the app.
- September repairs a device that remained after an unexpected exit.
- Spoken messages use native playback. Voice-list previews keep their current player.
- A failed cloud voice still uses the system voice.

## Verification

- The unit tests cover state changes and command wiring.
- A macOS test finds `September Microphone` and confirms that it has an input stream.
- The app build includes the system-audio privacy message.
- A manual FaceTime test selects the microphone and receives a spoken message.
