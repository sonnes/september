---
title: Virtual camera (desktop)
description: A Core Media I/O extension overlays the current Talk text on a physical camera feed for calling apps.
package: desktop
---

# Virtual camera

September can publish `September Camera` as a macOS camera. FaceTime and other
camera clients receive the physical camera feed with the current Talk text near
the bottom of each frame. The published September mark stays in the bottom-left
corner, even when the Talk composer is empty.

## Keep video inside the extension

The camera extension owns the `AVCaptureSession`. It captures the selected
physical camera at 1280×720 and 30 frames per second, composites the overlay,
and publishes each `CMSampleBuffer` through a Core Media I/O source stream.

No video frame enters Rust, JavaScript, or the WebView. September sends only a
small JSON text state through one custom Core Media I/O device property.

## Render text when it changes

The extension shapes the text with Core Text and keeps the result as a Core
Image overlay. Each camera frame reuses that image until the Talk text changes.

A Metal-backed `CIContext` composites the camera and overlay into buffers from
one `CVPixelBufferPool`. The capture output discards late frames, so a slow
frame does not become growing call latency.

The extension loads `public/logo.svg` once and keeps the scaled, translucent
mark as another Core Image layer. Frames do not parse or rasterize the logo.

## Run only for a camera client

Core Media I/O calls the stream source when FaceTime starts and stops using the
camera. The extension starts physical capture for the first streaming client
and stops it after the last client leaves.

The extension remains installed after September quits. The user can disable it
from the Talk audio selector, and deleting September removes its bundled system
extension.

## Activate a signed bundle

macOS activates camera extensions only from an application in `/Applications`.
The application and its embedded extension must also carry valid signatures
and their respective system-extension and camera entitlements.

The build wrapper compiles the Xcode target before Tauri creates the app bundle.
An unsigned local build verifies compilation but cannot activate the camera.
