---
title: Reading the frontmost app's accessibility tree
description: How September finds the text field the user is typing into — the AX API path, what each app actually exposes, and the traps found by probing macOS 26.5.2.
date: 2026-07-27
---

# Reading the frontmost app's accessibility tree

Measured on macOS 26.5.2 (Darwin 25.5.0) with a throwaway probe, not from
memory. Every result below was read off a live app.

## 1. The API path

Accessibility is a per-process tree of `AXUIElement`s reached through
`ApplicationServices`. Three roots exist:

| Root | Built with | Use |
|---|---|---|
| An app | `AXUIElementCreateApplication(pid)` | Anything about one app, running or in the background |
| Everything | `AXUIElementCreateSystemWide()` | The element with keyboard focus, whichever app owns it |
| A point | `AXUIElementCopyElementAtPosition` | Hit testing under the pointer |

From a root, `AXUIElementCopyAttributeValue` reads attributes
(`kAXChildrenAttribute`, `kAXRoleAttribute`, `kAXValueAttribute`, …) and
`AXUIElementCopyParameterizedAttributeValue` reads the ones that take an
argument, such as `kAXStringForRangeParameterizedAttribute`.

The whole thing needs Accessibility permission — the same grant that lets us
post keystrokes. Without it every read returns `kAXErrorAPIDisabled`.

Getting to the field the user is typing into:

```
AXUIElementCreateApplication(frontmost pid)
  → kAXFocusedUIElementAttribute      the focused element
    → kAXRoleAttribute                AXTextArea / AXTextField / AXWebArea / AXWindow…
    → kAXSubroleAttribute             AXSecureTextField for passwords
    → kAXValueAttribute               its text
    → kAXSelectedTextRangeAttribute   caret and selection, as a CFRange
    → kAXNumberOfCharactersAttribute  length, without copying the text
```

**Ask the app, not the system.** `AXUIElementCreateSystemWide()` +
`kAXFocusedUIElement` is the documented route and it is the one every tutorial
shows, but it returns *nothing* whenever the window server's key window and
`NSWorkspace.frontmostApplication` disagree — which is the normal state after an
app is activated programmatically, and was the state for TextEdit in this probe
until something clicked into its window. The app's own element answers in both
cases. September asks the frontmost app first and keeps the system-wide element
as a fallback.

### Changes

Polling is the wrong shape. `AXObserverCreate(pid, callback, &observer)` plus
`AXObserverAddNotification` delivers:

| Notification | Fires when |
|---|---|
| `kAXFocusedUIElementChangedNotification` | Focus moves — register on the **app** element |
| `kAXValueChangedNotification` | The text changes |
| `kAXSelectedTextChangedNotification` | The caret or selection moves |

Value and selection notifications are announced on the app element by some apps
and only on the focused element by others, so register on both. The observer's
`AXObserverGetRunLoopSource` goes on the main run loop; callbacks are C function
pointers, so the receiver travels in the refcon.

Not every app announces anything. September also re-reads ~50 ms after each
keystroke it posts, which covers the quiet ones.

### Electron and Chromium

They build no accessibility tree until an assistive app asks for one. Setting
`AXManualAccessibility` to true on the app element flips the same switch
VoiceOver does. Before setting it, VS Code's focused element read as nothing;
after, it read as a real `AXTextArea` with its text.

### Big fields

An editor's text area reports the whole document in `kAXValueAttribute`, and
copying it on every keystroke is waste. Read `kAXNumberOfCharacters` first, and
past a few hundred characters ask for a window around the caret with
`kAXStringForRangeParameterizedAttribute`.

## 2. What apps actually expose

Probed by activating each app and reading its focused element:

| App | Role | Text | Mirrors |
|---|---|---|---|
| TextEdit | `AXTextArea` | full document, caret as `AXSelectedTextRange` | yes |
| VS Code (Electron, after `AXManualAccessibility`) | `AXTextArea` | the focused editor's text | yes |
| iTerm2 | `AXTextArea` | the scrollback, caret at the prompt | yes |
| Safari, Chrome (page focused, no field) | `AXWebArea` | `""` | no — falls back to our echo |
| Zed | `AXWindow` | none | no — falls back to our echo |
| Login window password | `AXTextField` / `AXSecureTextField` | `""`, value withheld by macOS | never |

Web text fields inside `AXWebArea` do report as `AXTextField`/`AXTextArea` once
focused; the empty `AXWebArea` above is what a page with no field focused looks
like.

## 3. Traps

- **Secure fields.** Subrole `AXSecureTextField`. macOS returns an empty value,
  but `AXValue` is *settable* — never treat it as a field to mirror, and never
  keep our own copy of what was typed into one.
- **A locked screen collapses everything.** With the screen locked, every
  element of every app reads back as `AXApplication`, and system-wide focus is
  the login window's password field. Any probing done then is meaningless.
- **An app with nothing focused returns itself.** `kAXFocusedUIElement` on the
  app element can answer with the app, role `AXApplication`. It has no value, so
  it falls out as "nothing to mirror" — but a role check is clearer.
- **`CFRange`, not `NSRange`.** `AXSelectedTextRange` is an `AXValue` wrapping a
  `CFRange`; unwrap with `AXValueGetValue(_, .cfRange, &range)`. Offsets are
  UTF-16, so a caret can land between the halves of an emoji.
- **Trust is per code signature.** Running unbundled from a terminal that
  already holds the permission inherits it, which is how all of this was probed
  without a single System Settings trip.

## 4. Tooling

`swift run September --ax` prints the focused field exactly as September sees
it; `--tree` adds the app's tree, `--wait 5` delays the read so you can click
into whatever you want to inspect.
