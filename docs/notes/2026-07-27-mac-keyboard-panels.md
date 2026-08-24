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

## Injection, verified

Run unbundled as a child of a terminal that already holds Accessibility
permission (`make run`, or `.build/debug/September`) and the app inherits that
trust — no banner, no System Settings trip. That is the fastest dev loop; the
signed `.app` still needs its own grant.

Driving September's keys through the accessibility API with TextEdit in front:

| Pressed | TextEdit shows |
|---|---|
| H, I | `hi` |
| Shift, T, Delete | `hi` (uppercase T typed, then deleted) |
| Select All ⌘A, Cut ⌘X | empty, clipboard `hi` |
| Shift, A | `A` |
| Caps Lock, B, C, Caps Lock | `ABC` |
| Paste ⌘V | `ABChi` |
| Undo ⌘Z | `ABC` |

Latching shift, caps lock, and panel shortcuts all reach the frontmost app.

## Input mirroring (added after the plan)

The plan called the input bar an echo of our own keystrokes. It now mirrors the
focused field of the app in front instead, read over the accessibility API, and
only falls back to the echo when an app exposes no text. Password fields show
nothing and leave nothing in the buffer. Concept:
`docs/concepts/input-mirroring.md`; API findings:
`docs/research/2026-07-27-reading-the-focused-field.md`.

Verified live, with September driven through `AXPress`:

| Frontmost | Input bar |
|---|---|
| TextEdit with a document | `hello mirror`, label "Text in TextEdit" |
| Typing `XY` in TextEdit directly | updates to `XYhello mirror` (AXObserver) |
| Pressing September's W key | updates to `whello mirror` (post-keystroke re-read) |
| Pressing September's Undo ⌘Z button | back to `hello mirror` |
| Switching to Zed (exposes no text) | falls back to the local echo, empty |
| A 3 000-character document, caret at the end | 200-character window ending at the caret, reported at offset 200 |

Two decisions the plan was silent on: the accent at 30% became a `selection`
token (the design system has no selection colour), and the caret is drawn
between three text runs rather than at a measured offset — the bar shows one
line, so splitting the string is enough.

## Tree viewer and detached controls (added after the plan)

A second floating window at the right edge shows the frontmost app's
accessibility tree, focused element highlighted, refreshed on focus and app
changes (coalesced to one read per 500 ms — a tree costs hundreds of round
trips). It is on by default and toggles from the menu bar item.

Both windows share the screen's bottom edge and the same 24pt margin, so their
heights match by construction: the viewer is built with the keyboard's measured
height, and the keyboard centres in the width left over once the viewer's 320pt
is reserved. Verified live at 1708×486 and 320×486, same `y`.

The input bar and mode buttons no longer sit on the keyboard's surface — the
background moved to the keys-and-panels block alone, leaving the controls
floating on transparency.

Two constraints found the hard way: `ImageRenderer` renders nothing inside a
`ScrollView` (hence `AXTreeView(scrolls:)`, false for snapshots), and a lazy
stack has the same problem, so the rows are a plain `VStack` over a capped tree.

## Keeping the mirror and the tree in sync

The viewer now opens collapsed: `AXTree.rows()` unfolds only the branch that
leads to the focused element, and every other row reports how many children it
is hiding. `AXTreeReader` walks up from the focused element through `AXParent`
first and pins that chain, so the branch survives the node budget no matter how
big the app's tree is.

Two refresh paths, deliberately different in cost: the field is re-read every
500 ms (a handful of attribute reads, and identical results publish nothing),
while the tree — hundreds of round trips — is rebuilt only when focus lands
somewhere else, on app switches, on a 2 s timer, and from its refresh button.

One race was found and fixed. `KeyboardController` and `FocusWatcher` each
observed `didActivateApplication`; the delivery order between them is not
defined, so the controller's "clear the old app's text" could land *after* the
watcher had already published the new app's field. The bar then stayed empty
until something else changed — reproducible by switching away from TextEdit and
back. The watcher is now the only observer and calls `appChanged` itself, before
its first read.

## Light appearance (added after the plan)

The app now follows the system setting. Issue #10 defines only a dark palette,
so every token became a `ThemeColor` pair: the issue's value in the dark column,
a derived value in the light one. Nothing about the dark appearance changed.

The light column was derived by role rather than by hex — surfaces invert
(`key` #1A1A20 → white, `background` #1C1C1E → #EDEDF2), text inverts, strokes
flip from white-on-dark to black-on-light, and the rainbow row hues are taken
down far enough to hold their contrast on a white key (#FF6B7A → #C01829, and so
on for the other five). Judgement was kept out of it where possible: `RGBA` now
computes WCAG luminance and contrast, and `DesignTests` holds key text to 4.5:1
and secondary labels, the accent and every rainbow tint to 3:1, in both columns.

That check found one thing worth recording: the design system's own
`sectionLabel` (#606070 on #1C1C1E) measures **2.8:1**, under the 3:1 floor. The
dark column keeps it — it is the design system's call, not ours — and the test
instead requires the light column to clear 3:1 and to be no worse than dark.
Worth raising with the design owner.

Resolution is `NSColor(name:dynamicProvider:)` behind `Color(_ token:)`, so the
appearance is read at draw time and no window pins one. `--snapshot --light`
renders the light column (`make snapshots` writes `keyboard-light.png`).

## Still unverified

- A password field end to end. The subrole check matches what the login window
  exposes (`AXSecureTextField`, value withheld), but no app was driven into a
  password field to watch the bar go blank.
- Holding delete to repeat (needs a real pointer hold, not `AXPress`).
- A non-US input source rebuilding the key code map on
  `kTISNotifySelectedKeyboardInputSourceChanged`.
- Switch Control scan order and VoiceOver phrasing on real hardware, and Dwell
  clicking — the `AXPress` path they all use does work.

## Left out

Predictions, word suggestions, Talk/Write/Settings modes (buttons render, inert),
light theme, `.ascconfig` export, panel editing UI.
