---
title: Implementation notes — macOS keyboard and shortcut panels
plan: docs/plans/2026-07-27-mac-keyboard-panels.md
date: 2026-07-27
---

# Notes — macOS keyboard + shortcut panels

Only what the plan does not say: decisions taken where the spec was silent,
deviations, and what a reviewer should check.

## Deviations from the plan

**Tests are not `swift test`.** Xcode is not installed on this machine — the
Command Line Tools ship neither swift-testing nor XCTest, so SwiftPM cannot
build a test target at all. Tests run as an executable (`make test`) against a
~40-line harness. 218 checks, same red/green loop. Swapping to swift-testing
later is mechanical.

**Key widths are proportional, not fixed.** The design system says a standard
key is 48pt and the keyboard is 980pt wide. Those cannot both be true: the
widest row is 14.5 key-units, which at 48pt fills 711pt, and the mock clearly
shows keys filling the full width. Resolution: the component library renders at
the specified sizes (48/60/32), and an assembled row distributes 980pt by
weight. `KeyboardLayout.widths(for:)` is the single place this happens and is
covered by a test asserting every row totals exactly 980pt.

**Six rows, not five.** The issue lists five row tints; the mock has six rows
(the shift row is tinted cyan, distinct from the purple modifier row).
`KeyboardRow` has a `.shift` case.

**No pre-measured panel size.** `ScaledKeyboardScreen` was dropped: measuring
the layout inside SwiftUI and then framing it with the measured size collapses
to zero. The app measures with a probe `NSHostingView` and hands the panel an
explicit size, re-measuring when the permission banner appears.

## Decisions where the spec was silent

- **Chords beat character transformation.** With a modifier other than shift
  latched, a letter key sends the base key plus every active flag (⌘C), instead
  of typing a character. Shift alone still uppercases and picks the secondary
  glyph on dual keys. This is in `KeyboardController.type(_:secondary:)`.
- **The echo is not a text buffer.** Keys go straight to the frontmost app; the
  input bar mirrors what we sent since the last Return. Delete drops a
  character, Return clears. Nothing here is editable — the panel never takes
  focus, by design.
- **Latching model:** tap = one keystroke, second tap = locked, third = off.
  Caps lock is a plain toggle and is never posted as a key (macOS owns it); it
  only affects case.
- **The right keypad is two panels** (`navigate` + `system`), matching the two
  section headers in the mock.
- **App shortcuts are data from the start.** `Panels/Apps/<bundle id>.json` with
  `generic.json` as the fallback, swapped on
  `NSWorkspace.didActivateApplicationNotification`. VS Code ships as the first
  real entry, as in the mock.
- **No launch-time permission prompt.** Starting September never throws a system
  dialog over the user's work; the banner and the menu item ask for it.

## Token conflict, resolved

The issue body and `design-specifications.png` disagree on the key fills. The
mocks match the issue body, so `Tokens.swift` uses `#1A1A20` / `#141418` /
`#F0F0F5` with the spec sheet's *names* (`kbKey`, `kbKeySpecial`, `kbKeyText`…).
Light mode is not implemented — dark only, both variants.

## Verified

- `make test` — 218 checks pass.
- Snapshots (`--snapshot`, `--mono`, `--gallery`) match the mocks in issue #10.
- Running app: window at level 3 (floating), 1676×506, bottom-centred,
  activation policy `.accessory` (no Dock icon), and the frontmost app stays
  frontmost when the panel appears — it does not steal focus.
- Accessibility: 131 labelled elements, 115 with `AXPress`. Driving the app
  through the accessibility API (the same path Dwell and Switch Control use):
  Shift → H → I → Space → T → Delete leaves `Hi ` in the input bar, Return
  clears it. Latching, case and the echo all behave.

## Not verified — needs the user

Actual keystroke injection into another app. `CGEvent.post` requires
Accessibility permission, which cannot be granted programmatically. Grant
September permission (banner ▸ Open Settings), then check in TextEdit:

1. letters, shift, caps lock;
2. ⌘C / ⌘V / ⌘Z / ⇧⌘Z from the edit keypad;
3. holding delete repeats;
4. switch the input source to a non-US layout — the key code map rebuilds on
   `kTISNotifySelectedKeyboardInputSourceChanged`.

Also unverified: Switch Control scan order and VoiceOver phrasing on real
hardware, and Dwell clicking (the AX path works, which is what Dwell uses).

## Left out

Predictions, word suggestions, Talk/Write/Settings modes (buttons render, inert),
light theme, `.ascconfig` export, panel editing UI.
