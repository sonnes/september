---
title: Input mirroring (macOS)
description: The input bar shows the text of the field the user is typing into, read back over accessibility, with its caret and selection — falling back to an echo of our own keystrokes when an app exposes nothing, and showing nothing at all for a password.
package: swift
---

# Input mirroring (macOS)

September types into other apps, so the user is looking at two places at once:
our keyboard at the bottom of the screen and their text somewhere above it. The
input bar closes that gap by showing the focused field's own text, read back
over the accessibility API — the same text, at the same caret, right above the
keys.

It is a mirror, never an editor. The panel does not take focus, so there is
nothing in the bar to click into.

## Three states

`InputMirror` is what the bar draws, and `KeyboardController.input` is the only
place it comes from:

| State | When | Shown |
|---|---|---|
| `.mirrored(text:caret:selectionLength:)` | The field reports editable text | The text, split at the caret, selection tinted |
| `.local(text:)` | The app exposes no text (terminals, canvases, Zed) | What September has typed since the last Return |
| `.secure` | A password field (`AXSecureTextField`) | "Password field — hidden", and nothing else |

`FocusedField.display` makes that decision from one accessibility read; the
controller only has to choose between it and the local echo.

Two rules follow, and both are tested:

- **While mirroring, the local echo stays empty.** Otherwise it would be a
  second, staler copy of the same text, and it would surface the moment the user
  moved to an app that mirrors nothing.
- **Nothing typed into a password field is kept.** Not in the buffer, not on
  screen. The keystrokes still go through.

## Where the text comes from

`FocusWatcher` (app target — it needs a running app and the permission) reads
the frontmost app's `AXFocusedUIElement` and turns it into a `FocusedField`. It
re-reads when:

- the frontmost app changes (`NSWorkspace.didActivateApplicationNotification`),
- the app announces a change (`AXObserver` on focus, value and selection),
- September itself posts keystrokes — `CGEventSink.afterPost` triggers a read
  50 ms later, which covers apps that announce nothing,
- every 500 ms regardless, which covers what nothing else does: a caret moved
  with the hardware keyboard, or an app that announces neither.

An app switch is the one case where order matters. The watcher calls
`onAppChanged` first, which clears the last app's text, and only then reads the
new app's field — otherwise the clear can land after the read and the bar sits
empty until the next change. That is why nothing else in the app watches
`didActivateApplication`.

Which apps expose what, and why the frontmost app is asked rather than the
system-wide element, is in
`docs/research/2026-07-27-reading-the-focused-field.md`.

## Seeing it

```sh
swift run September --ax          # the focused field as September reads it
swift run September --ax --tree   # plus the app's accessibility tree
```
