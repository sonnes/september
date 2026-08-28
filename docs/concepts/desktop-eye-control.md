---
title: Eye-tracker test bed (desktop)
description: One desktop page crops its in-memory feed around the face and calibrates native pupil landmarks to a pointer inside that box.
package: desktop
---

# Eye-tracker test bed (desktop)

Eye tracking is an isolated desktop experiment reached through **Eye tracker**
in the sidebar. It is not an application input method. The pointer cannot press
a control, leave the camera box, appear on another page, or move the macOS
pointer.

The data path is:

```text
AVFoundation frame
  -> Apple Vision pupils and eye outlines
  -> eye-relative Rust point
  -> fixed low-pass filter
  -> smoothed face crop and 320-pixel in-memory preview event
  -> four-corner box calibration
  -> mapped point clamped and clipped inside the preview box
```

Rust keeps the full 1280×720 frame. Vision's face box becomes a padded 16:9
crop whose movement is filtered before Rust sends a downsampled RGBA preview
at no more than five frames per second. The same event contains the smoothed
eye-relative point when both pupils are valid. A closed eye, missing pupil,
multiple faces, or weak landmark confidence hides the pointer.

Calibration shows four targets inside the box. The WebView ignores the first
half-second at each target, takes the median of the following samples, and fits
independent linear mappings for x and y. This also handles reversed camera
axes. The pointer appears only after all four targets produce a usable fit.

The page keeps the latest frame in React memory only. It starts capture only
after the user presses **Start camera**. Stopping or leaving the page joins the
native capture thread and clears the frame and calibration. No other route
mounts an eye-tracking component.

The test bed has no activation behavior. Its purpose is to check the native
signal and box mapping on real hardware before a product input method is
designed.
