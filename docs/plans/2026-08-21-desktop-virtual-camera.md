---
title: Desktop virtual camera
description: Publish the physical camera with the current Talk text overlaid for calling apps.
package: desktop
---

# Desktop virtual camera

## Goal

Let a user select `September Camera` in FaceTime and show the current Talk text
over the physical camera feed.

## Plan

1. Add failing tests for the extension bundle, native commands, frame pipeline, and Talk control.
2. Add a Core Media I/O camera extension that captures one physical camera at 720p and 30 frames per second.
3. Composite a cached text image onto reusable pixel buffers with a Metal-backed Core Image context.
4. Activate the extension and send text changes through a native Tauri bridge.
5. Keep the camera control in the Talk audio selector beside the virtual microphone.
6. Update the desktop READMEs, contributor rules, and concept documentation.
7. Run the frontend, Rust, Swift, bundle, formatting, and lint checks.

## Behavior

- The camera extension stays installed until the user turns it off or removes September.
- Capture starts only when a camera client requests frames.
- September sends text updates to the extension instead of sending video frames through the WebView.
- The extension caches the rendered text and reuses it until the text changes.
- A late frame is dropped instead of increasing call latency.
- FaceTime selects the camera manually from its Video menu.

## Verification

- Static tests cover command registration, bundle placement, and the Talk control.
- Swift tests cover overlay bounds and cached text state.
- The extension target compiles against the installed macOS SDK.
- The Tauri application build contains the system extension and host entitlements.
- A manual FaceTime test confirms the camera feed and text overlay.
