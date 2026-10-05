---
title: Rust eye tracking for an in-app pointer
description: A macOS-native gaze pipeline can feed a target-aware dwell pointer in September, but webcam accuracy must pass a user-level prototype gate before product integration.
date: 2026-08-28
package: desktop, app-ui
---

# Rust eye tracking for an in-app pointer

- **Audience:** September maintainers deciding whether to prototype eye control
- **Scope:** the macOS Tauri app and its shared application UI
- **Status:** the original control prototype is reduced to an isolated camera-
  box test bed; user validation is still required
- **Date checked:** 2026-08-28

## Recommendation

The current experiment is recorded in the
[`eye-tracker test-bed plan`](../plans/2026-08-28-eye-tracker-test-bed.md). It
shows one face-cropped camera feed and one clipped pointer at `#/eyetracker`.
Four in-memory corner samples calibrate the pointer to that box. It has no dwell
activation, global overlay, or saved data. The product recommendations below
remain the gate for any future integration.

Build one narrow, Rust-hosted experiment before designing a product feature:

1. Capture the selected camera with AVFoundation.
2. Read the eyes, pupils, face box, and head pose with Apple Vision.
3. Fit a small per-user calibration model from those features to screen
   coordinates.
4. Filter the estimated point, but preserve quick movements.
5. Stream only gaze samples and status to the WebView through a Tauri channel.
6. Let the UI choose a registered September control and activate it after a
   visible dwell.

Do not move the macOS pointer in this experiment. A virtual pointer inside
September needs no Accessibility permission, cannot click another app by
mistake, and can use knowledge of the app's large controls to compensate for
webcam error.

The experiment is a decision gate. Apple Vision exposes the native signals we
need, but its pupil landmarks are not documented as an eye-tracking product.
The prototype must prove target selection with intended users before this
becomes a feature.

## What the linked project contributes

The [HN post](https://news.ycombinator.com/item?id=42185842) links to
[Pinch](https://github.com/reynaldichernando/pinch), a hand tracker rather than
an eye tracker. Its current architecture runs MediaPipe Hand Landmarker in
JavaScript, sends a coordinate and pinch state through a Tauri command, and
uses Rust plus `enigo` to move the operating-system mouse. The Rust command is
only the final mouse driver; inference is not written in Rust.

The useful lessons still transfer:

- Normalize geometry before mapping it to a display.
- Keep old frames out of the path, because lag is worse than a dropped frame.
- Expect landmark jitter and use a speed-aware filter.
- Separate movement from activation. Pinch uses a buffered gesture; gaze needs
  dwell or a separate switch.
- Calibration is part of the input method, not a setup detail.

Pinch eventually replaced a moving average with the
[One Euro filter](https://gery.casiez.net/1euro/) to reduce slow jitter without
adding as much fast-motion lag. Its author still found unstable landmarks and
activation drift in the front-facing mode. Eye control has the same class of
problem, plus the "Midas touch" problem: looking is usually observation, not a
request to act.

## Why an ordinary webcam is the hard limit

A webcam tracker can be useful, but raw pixel accuracy is not reliable enough
to treat it like a mouse. The original
[WebGazer study](https://cs.brown.edu/people/apapouts/papers/ijcai2016webgazer.pdf)
reported mean errors of 175 to 210 pixels in its remote study and a 4.17-degree
average visual-angle error in a small lab comparison. The
[GazeCapture project](https://gazecapture.csail.mit.edu/) reported 1.3 cm error
after calibration on phones and 2.1 cm on tablets. These results use different
devices and experiments, so they are not predictions of Apple Vision.

They do show the scale of the problem. September's minimum target is 44 px.
The WebGazer mean error is about four such targets at that study's display
scale. This is why the application must resolve gaze against intended targets
instead of dispatching a click at the raw coordinate.

Calibration is not optional. Eye appearance, camera placement, head position,
glasses, lighting, and display geometry all change the mapping. The calibration
must also include a validation pass, because a completed calibration is not
necessarily a usable one.

## Proposed system

```text
AVFoundation camera
  -> latest CVPixelBuffer only
  -> Apple Vision face landmarks
  -> normalized eye + pupil + head-pose features
  -> per-user screen calibration
  -> confidence gate + One Euro filter
  -> Tauri Channel<GazeEvent>
  -> viewport coordinate
  -> registered-target resolver
  -> visible dwell state machine
  -> the control's existing action
```

The boundary matters. Rust owns the camera, frames, inference, calibration,
and filtering. TypeScript receives no image, face geometry, or pupil location.
It receives a timestamped screen point, a confidence value, and tracker status.

### 1. Capture frames in Rust

Use AVFoundation directly through the `objc2` framework crates:

- `objc2-av-foundation` for `AVCaptureSession`, `AVCaptureDeviceInput`, and
  `AVCaptureVideoDataOutput`;
- `objc2-core-video` and `objc2-core-media` for pixel buffers and timestamps;
- `objc2-vision` for face observations and landmarks;
- `dispatch2` for the serial capture and analysis queues.

[`AVCaptureVideoDataOutput`](https://docs.rs/objc2-av-foundation/latest/objc2_av_foundation/struct.AVCaptureVideoDataOutput.html)
delivers frames for processing. The current
[`objc2-vision` bindings](https://docs.rs/objc2-vision/latest/objc2_vision/struct.VNDetectFaceLandmarksRequest.html)
cover `VNDetectFaceLandmarksRequest` on both Apple Silicon and Intel macOS.
This route adds Rust bindings but no Python process, OpenCV build, C++ sidecar,
downloaded model, or network request.

Keep one replaceable frame slot between capture and analysis. If inference is
busy, replace the waiting frame with the newest one. Never build a FIFO of
camera frames; it converts load into pointer lag. Start with one face and a
measured 15 analysis frames per second. Benchmark 720p and 1080p rather than
choosing a capture size in advance, because the eyes need pixels while Vision
also needs time.

All Objective-C capture and Vision objects stay on their required serial
queues. Only a small owned Rust feature vector crosses into the calibration
worker.

### 2. Derive gaze features with Apple Vision

Apple's `VNDetectFaceLandmarksRequest` returns a face observation with eye
outlines, left and right pupil points, landmark confidence, and face pose.
Apple explicitly warns that a pupil value may be inaccurate during a blink.
The Rust binding exposes
[`leftPupil`, `rightPupil`, both eyes, and confidence](https://docs.rs/objc2-vision/latest/objc2_vision/struct.VNFaceLandmarks2D.html),
while `VNFaceObservation` exposes the face box plus
[`yaw`, `pitch`, and `roll`](https://docs.rs/objc2-vision/latest/objc2_vision/struct.VNFaceObservation.html).

Vision reports facial landmarks in the coordinate system of the face box, not
the whole image. Apple's
[`VNFaceLandmarks2D` documentation](https://developer.apple.com/documentation/vision/vnfacelandmarks2d)
defines that box-relative coordinate space. Convert each pupil to a position
relative to its own eye outline before calibration. This removes most changes
caused only by face size or image position.

A first feature vector can contain:

```text
left pupil x/y within left eye
right pupil x/y within right eye
face box center x/y and width/height
face yaw, pitch, and roll
eye opening for each eye
constant and quadratic interaction terms
```

Compute eye opening from the outline. Reject a sample while either eye is
closed relative to the user's open-eye baseline, while a pupil is missing, or
while landmark confidence is below the value chosen by measurement. Do not
move the pointer during rejected samples. Freeze it briefly, then hide it if
valid samples do not return.

### 3. Calibrate to the display

Show nine points that cover the usable September window. At each point:

1. Wait for stable, valid landmarks.
2. Show a short visible collection countdown.
3. Collect a small time window and use its median feature vector.
4. Keep the exact physical display coordinate of the point.

Fit two regularized least-squares regressions, one for screen x and one for
screen y. A quadratic feature expansion is small enough to fit locally and can
model some interaction between eye rotation and head pose. Keep the solver and
feature extraction in pure Rust so tests can exercise them without a camera.

Use additional points only for validation. Report median error, 90th-percentile
error, actual September-target hit rate, and the worst region of the screen.
Do not enable eye control when validation fails. Offer a shorter recheck on
later starts, but require full recalibration after the camera, display, scale,
or camera-to-display geometry changes.

Store only the coefficients and calibration metadata. Key a profile by the
operating-system user, camera identifier, display identifier, display mode,
and scale factor. The existing JSON settings table can hold this data. Never
store frames or eye crops.

### 4. Filter and gate the point

Run a One Euro filter independently on x and y after calibration. Its authors'
[tuning guide](https://gery.casiez.net/1euro/) starts by reducing stationary
jitter with `mincutoff`, then increases `beta` to reduce lag during fast motion.
Tune against recorded numeric samples, not by copying the Pinch constants;
units, frame rate, and noise differ.

The tracker should also:

- reset filters after face loss or a long rejected interval;
- attach a monotonically increasing sequence and capture timestamp;
- discard a result if a newer inference has already completed;
- lower confidence as calibration residual, landmark confidence, or head-pose
  distance from the calibration range worsens;
- pause rather than extrapolate when confidence is too low.

Filtering makes a trace pleasant. It does not make an inaccurate estimate
correct, so target resolution still consumes the uncertainty.

### 5. Stream samples through Tauri

Expose a small backend surface:

```text
gaze_status() -> GazeStatus
gaze_start(on_event: Channel<GazeEvent>)
gaze_stop()
gaze_calibration_begin(display)
gaze_calibration_sample(point)
gaze_calibration_finish() -> CalibrationReport
```

Use a Tauri channel for the continuous stream. Tauri documents that its event
system is not intended for low-latency or high-throughput traffic and that
[channels are the ordered, streaming path](https://v2.tauri.app/develop/calling-frontend/).
Commands remain appropriate for lifecycle and calibration actions.

A sample crossing the boundary should stay small:

```ts
type GazeEvent =
  | {
      event: "sample"
      data: {
        sequence: number
        capturedAtMs: number
        screenX: number
        screenY: number
        confidence: number
      }
    }
  | {
      event: "status"
      data: {
        state:
          | "ready"
          | "noFace"
          | "lowConfidence"
          | "permissionDenied"
          | "cameraInterrupted"
          | "stopped"
      }
    }
```

The backend predicts physical display coordinates. The desktop service converts
them to WebView CSS coordinates from the window's inner position and scale
factor. This lets the window move without changing the gaze model. Pause when
the window straddles displays or leaves the calibrated display.

### 6. Resolve intent inside September

The React side needs a target registry, not `document.elementFromPoint()` plus
a synthetic click. Each supported control registers:

- its element and current rectangle;
- whether it is available;
- its interaction group;
- the existing semantic action to call;
- whether it can activate by dwell or needs an explicit switch.

The registry ignores hidden controls, plain reading content, and anything with
`aria-disabled="true"`. Gaze hover does not move DOM focus. Focus changes only
when activation requires it, so eye control does not steal the place of a
keyboard or switch user.

Resolve a sample in this order:

1. Keep the current target inside a larger exit area to prevent boundary
   flicker.
2. Prefer a target whose padded rectangle contains the sample.
3. Within the same logical group, consider the nearest target inside a maximum
   uncertainty radius.
4. Otherwise select no target and do not start a dwell.

The resolver can later accumulate probabilities instead of hard points.
[BayesGaze](https://graphicsinterface.org/proceedings/gi2021/gi2021-35/)
showed that accumulating posterior probability over a gaze trajectory improved
selection speed and accuracy over ordinary dwell and center-of-gravity mapping.
A 2026 study found that expanded Voronoi selection areas, visible selection
feedback, and a gaze cursor can further improve accuracy
([ACM article](https://doi.org/10.1145/3806034)). A first version can use padded
rectangles and hysteresis, but the API should preserve confidence and the
candidate list so probability-based selection remains possible.

### 7. Make dwell safe

The pointer overlay is `position: fixed` and `pointer-events: none`. It uses the
existing indigo ring and honors reduced motion. A ring around the candidate
fills during dwell, which makes the pending action visible before it happens.

The state machine needs more than one timer:

```text
idle -> candidate -> dwelling -> activated -> wait-for-exit -> idle
```

- Start only after the same target is stable for a short acquisition period.
- Accumulate dwell while the samples remain in the target's exit area.
- Decay or reset when confidence falls; never finish a dwell on stale data.
- After activation, require gaze to leave the target before it can activate
  again.
- Cancel immediately when the target unmounts or becomes unavailable.
- Keep a persistent Pause target, but let it resume eye control too.
- Make dwell time, movement tolerance, and post-action tolerance adjustable.

The post-action rule is essential for September. Taking a suggestion changes
the row under the same gaze point. Without a wait-for-exit state, one look can
take several changing suggestions.

Do not use blink as the default click. Vision says pupil positions can be wrong
during a blink, natural blinks would create false actions, and intentional
blinking adds fatigue. An assistive switch can be an optional activation source
through the same target resolver.

Destructive controls retain their existing confirmation dialog. Sliders,
dragging, arbitrary scroll, text selection, and OS-wide pointing are outside
the first experiment.

## Fit with September's architecture

The feature fits existing boundaries:

| Area | Proposed owner |
| --- | --- |
| Camera, Vision, calibration, filtering | `apps/desktop/src-tauri/src/gaze/` |
| Tauri commands and channel types | `apps/desktop/src-tauri/src/rpc.rs` plus the gaze module |
| Desktop adapter and coordinate conversion | `apps/desktop/src/services/gaze.ts` |
| Target resolver and dwell rules | pure code in `packages/core/` |
| Overlay, provider, target registration | `packages/app-ui/` |
| Camera permission and signed entitlement | `apps/desktop/src-tauri/Info.plist` and `September.entitlements` |

Shared UI should import an `@platform/services/gaze` capability. The browser
adapter reports unavailable. This keeps the virtual pointer and target behavior
shared without importing Tauri from `packages/app-ui`.

September already makes good target-level choices for gaze: 44 px controls,
generous gaps, visible focus, persistent pick lists instead of dropdowns, and
`aria-disabled` controls that keep their place. The eye-control layer should
not weaken those guarantees. It must also leave ordinary mouse, keyboard,
screen reader, and switch operation unchanged when it is off.

## Permissions and privacy

Camera permission is requested only after the user turns on eye control. Apple
requires both an `NSCameraUsageDescription` purpose string and the camera
entitlement for a macOS capture app. Apple warns that attempting capture
without them can terminate the app
([authorization guide](https://developer.apple.com/documentation/AVFoundation/requesting-authorization-to-capture-and-save-media),
[camera entitlement](https://developer.apple.com/documentation/BundleResources/Entitlements/com.apple.security.device.camera)).
Tauri merges an app-owned `src-tauri/Info.plist` into its generated bundle
([Tauri macOS bundle guide](https://v2.tauri.app/distribute/macos-application-bundle/)).

Use a specific purpose string, such as: "September uses the camera on this Mac
to let you point at controls with your eyes. Video stays on this Mac and is not
saved."

Privacy invariants:

- frames and eye crops remain in native memory;
- no frame, landmark, calibration sample, or user gaze trail is logged;
- no camera data crosses the WebView boundary;
- no camera data is written to SQLite;
- only calibration coefficients and device/display metadata persist;
- capture stops when eye control is off, the window closes, or the app exits;
- the UI always shows that eye control is active or paused.

## Alternatives

| Approach | Benefit | Cost and verdict |
| --- | --- | --- |
| Apple Vision landmarks plus calibration | Small native dependency surface; no model asset; runs on both Intel and Apple Silicon | **Recommended first experiment.** Accuracy for this use is unproven, so gate it with real target tests. |
| MediaPipe Face Landmarker in the WebView | Fastest way to reproduce the linked project's shape; outputs 478 landmarks | Useful as a benchmark, not the Rust implementation. Google's Web API blocks the caller during detection unless it is moved to a worker. See the [official Web guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js). |
| ONNX gaze model in Rust | A trained model directly predicts gaze yaw and pitch; `ort` can use ONNX Runtime and its CoreML provider | Keep as an estimator replacement if Vision fails. It adds model provenance, 5–90 MB of weights, face preprocessing, ONNX Runtime packaging, and still needs personal screen calibration. |
| Move the macOS pointer | Works with every control and other apps | Not appropriate for the first version. It adds global mistakes, Accessibility permission, coordinate edge cases, and no awareness of September targets. |
| Depend on macOS accessibility alone | No code in September | macOS 26 includes camera-based Head Pointer and a Dwell system that works with eye- or head-tracking hardware, but Apple lists built-in Eye Tracking for iPhone and iPad, not Mac. September must remain compatible with these existing inputs, whether or not it adds its own tracker. See [Head Pointer](https://support.apple.com/guide/mac-help/use-head-pointer-mchlb2d4782b/26/mac/26), [Dwell](https://support.apple.com/guide/mac-help/mchl437b47b0/mac), and [Apple's feature matrix](https://www.apple.com/accessibility/features/). |

If Apple Vision misses the gate, test an ONNX estimator behind the same Rust
trait and `GazeEvent` contract. L2CS-Net reports a 3.92-degree mean error on
MPIIGaze in its paper
([paper](https://arxiv.org/abs/2203.03339),
[official MIT-licensed implementation](https://github.com/ahmednull/l2cs-net)).
An independent MIT-licensed MobileGaze project publishes ONNX weights, but its
reported Gaze360 errors are 11.33 to 13.07 degrees depending on the backbone
([model repository](https://github.com/yakhyo/gaze-estimation)). These are
dataset results, not pointer accuracy. A neural model is not automatically a
better pointer.

Rust can run such a fallback through the [`ort` crate](https://docs.rs/ort/latest/ort/)
and optionally the
[ONNX Runtime CoreML execution provider](https://onnxruntime.ai/docs/execution-providers/CoreML-ExecutionProvider.html).
Bundle the exact reviewed weights in the app; never fetch a model at runtime.

## Prototype gate

The spike should produce measurements, not a polished settings screen. Test the
native estimator against a MediaPipe or ONNX baseline using the same calibration
points, display, camera, and target task.

### Pure tests first

Write failing tests before implementation for:

- face-box and eye-relative coordinate conversion, including flipped axes;
- blink and confidence rejection;
- regularized calibration fitting against synthetic points;
- calibration serialization and device/display invalidation;
- One Euro filter reset and timestamp handling;
- viewport conversion at 1x and 2x scale;
- target padding, group boundaries, hysteresis, and confidence weighting;
- every dwell transition, especially unmount and post-action wait-for-exit.

### Measure on the real application

Use the 1376 by 1032 baseline and the actual Talk screen. Ask a participant to:

- choose word suggestions across the width of the stripe;
- choose adjacent phrases;
- focus the composer;
- activate Speak;
- change modes in the dock;
- pause and resume eye control.

Repeat with glasses if worn, ordinary and poor lighting, small natural head
movement, a posture break, and a camera reposition. Include users who represent
September's audience before treating a lab result from a developer as evidence.

Suggested release gates for the experiment are:

- at least 95% correct target selection on the scripted September task;
- no unintended activation in a 15-minute reading and composing session;
- capture-to-overlay latency below 150 ms at the 95th percentile;
- no growing frame or event queue under load;
- a failed or lost face cannot activate anything;
- calibration validation clearly tells the user when accuracy is insufficient;
- a user can pause eye control without a mouse.

These are proposed product gates, not published norms. Record raw numeric
coordinates and timing only in an explicit development benchmark with synthetic
or consenting test data. The shipped app follows the privacy invariants above.

## Decision after the spike

Proceed with product integration only if target-aware selection meets the gate
with intended users. If raw pointing misses but target selection succeeds, keep
the virtual pointer scoped to registered controls. If both Apple Vision and the
ONNX baseline miss, stop the webcam path and expose the same target resolver to
external eye-tracking or macOS Dwell inputs instead.

The key design decision is therefore not "which model moves a cursor." It is
"can a private, calibrated gaze signal select September's real controls without
accidental speech or text changes?" The Rust estimator is replaceable. The
target-aware activation contract is the durable part.
