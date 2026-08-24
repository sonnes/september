---
title: Native macOS app — keyboard and shortcut panels
description: Build September's macOS app in Swift, starting with the floating accessible keyboard and its shortcut panels, styled per issue #10.
date: 2026-07-27
status: draft — awaiting approval
research: docs/research/2026-07-27-macos-accessibility-keyboard.md
design: https://github.com/sonnes/september/issues/10
---

# Plan — native macOS keyboard + shortcut panels

## Goal

A floating, non-activating keyboard that types into whatever app is focused,
plus shortcut panels (edit, navigate, per-app) around it — driveable entirely by
pointer, dwell, or switch. Design system from issue #10. Fresh implementation;
none of the Swift code on `swift-keyboard-app` / `phase-1-keyboard` is reused.

## Scope

**In:** app shell, design tokens, key components, keyboard assembly, shortcut
panels, input bar chrome, floating panel, keystroke injection, modifier state,
accessibility pass.

**Out (later plans):** AI predictions, text-to-speech, transcription, writer,
settings screens, panel editor UI, iCloud/web sync. The input bar renders in
this phase but only echoes typed text — no suggestions.

## Understanding first (done)

`docs/research/2026-07-27-macos-accessibility-keyboard.md` records how Apple's
Accessibility Keyboard works: panels are `.ascconfig` data bundles, buttons hold
`ActionPerformKeyMacro` / `ActionPressKeyCharSequence` / `ActionOpenPanel`
actions, absolute-rect layout, no per-app awareness, and third parties cannot
render inside it. Three things carry into this plan directly:

1. Our panel model mirrors Apple's action vocabulary (type text, press key
   macro, open panel) — proven sufficient for a decade of AAC users.
2. Latching ("sticky") modifiers are mandatory, not a nicety.
3. Non-activating window + `CGEvent.post` is the whole injection story; no need
   to track the target app.

## Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Lives at `apps/swift/`, standalone SPM package | Matches repo convention (`apps/web`, `apps/server`); SPM keeps `swift build`/`swift test` in the terminal for TDD |
| D2 | Two targets: `SeptemberKit` (models, tokens, SwiftUI views) + `September` (executable: AppKit panel, CGEvent sink, menu bar) | Everything testable sits in a library; the executable holds only what needs a running app |
| D3 | Non-sandboxed, `LSUIElement`, menu-bar-only | Accessibility permission is unavailable in the sandbox; no Dock icon means no focus theft |
| D4 | Stable self-signed identity + fixed bundle ID `in.september.mac` | Ad-hoc signing revokes Accessibility permission on every rebuild |
| D5 | Panels are JSON data in the app bundle, decoded into the same action model Apple uses | Panels become editable later without touching views; leaves the `.ascconfig` export door open |
| D6 | Keys inject immediately into the focused app; the input bar is a local echo of what we sent since the last Return | Matches issue #10's acceptance criteria ("tapping keys types into TextEdit/Safari"). A compose-then-send buffer is a Talk-mode concern, not this phase |
| D7 | Dark theme only for this phase; Rainbow + Mono variants both ship | Both dark mocks are specified in issue #10; light mocks exist but are unreviewed |
| D8 | Char → keycode map built at runtime via `UCKeyTranslate` | Hardcoded US QWERTY breaks every non-US layout |

## Open questions

1. **Token conflict.** The issue body says key fill `#1A1A20`, special `#141418`,
   label `#F0F0F5`. The `design-specifications.png` sheet says `kbKey` dark
   `#3A3A3C`, `kbKeySpecial` `#2C2C2E`, `kbKeyText` `#F2F2F7`. The rendered mocks
   match the issue body. **Assumption: issue-body hex values win; token *names*
   from the spec sheet are kept** (`kbBackground`, `kbKey`, `kbKeySpecial`,
   `kbKeyText`, `kbAccent`, `kbKeyShadow`, `kbCornerRadius`).
2. **Right keypad contents.** Issue lists it loosely ("search, window
   management, scroll, zoom, arrows, system"). Assumption: exactly what the
   rainbow mock shows — search, mission control, scroll up/down, zoom −/+,
   arrow cluster, then a SYSTEM group with two buttons.
3. **App shortcuts panel.** Issue says placeholder, but the mock renders VS Code
   with 12 real shortcuts. Assumption: build it data-driven with a per-app JSON
   file and a generic fallback (cheap now, no rework in phase 4).
4. Minimum macOS version — assumption `.macOS(.v14)` unless you want 26-only APIs.

## Repo layout

```
apps/swift/
├── Package.swift              # tools 6.0, .macOS(.v14), no external deps
├── Makefile                   # build / run / test / bundle / sign
├── README.md
├── Resources/
│   ├── Info.plist             # LSUIElement, NSAccessibilityUsageDescription
│   ├── September.entitlements
│   └── Panels/*.json          # edit, navigate, system, apps/<bundle-id>.json
├── Sources/
│   ├── SeptemberKit/
│   │   ├── Design/            # Tokens.swift, Metrics.swift, KeyboardStyle.swift
│   │   ├── Keyboard/          # KeyDefinition, KeyboardLayout, ModifierState
│   │   ├── Panels/            # PanelDefinition, PanelAction, PanelStore
│   │   ├── Input/             # Keystroke, KeystrokeSink (protocol), KeyCodeMap
│   │   └── Views/             # KeyStandard, KeySpecial, KeyFunction, KeyDual,
│   │                          # ShortcutButton, ShortcutFull, assemblies, InputBar
│   └── September/             # SeptemberApp, FloatingPanel, CGEventSink,
│                              # PermissionGate, MenuBarController
└── Tests/SeptemberKitTests/
```

Root `Makefile` gains `mac-run`, `mac-test`, `mac-app`.

## Design tokens (issue #10, dark)

| Token | Value |
|---|---|
| `kbBackground` | `#1C1C1E` |
| `kbKey` | `#1A1A20` |
| `kbKeySpecial` / function | `#141418` |
| `kbKeyText` | `#F0F0F5` |
| secondary label | `#A0A0B0`, dual top label `#808090`, shortcut label `#C0C0CC` |
| stroke | `#FFFFFF18` standard, `#FFFFFF12` special/function, 1pt inside |
| shadow / glow | blur 1 y 1 `#00000040` / blur 8 `#FFFFFF08` |
| `kbAccent` | `#0A84FF` |
| `kbCornerRadius` | 6pt (keys) |

Sizes: standard 48×48, special 60×48 (flexible width), function 60×32, dual
48×48 (2pt gap), shortcut button 120×40, shortcut full 160×36. Keyboard 980pt
wide, keypads 200pt, input bar 980×48 radius 24, row spacing 3, section spacing
16. Type: standard 18 regular, special 12 regular, function 11 medium, dual
11/16, shortcut 11 medium / 10 regular.

Rainbow variant tints labels and the row's left edge per row (function red,
number orange, QWERTY amber, home green, bottom blue/purple). Mono uses
`kbKeyText` throughout. Style is one enum, applied at the row level.

## Milestones

Strict TDD per `CLAUDE.md`: failing test → minimum code → green. Each milestone
ends with the listed verification actually run.

### M1 — Scaffold and float

- `Package.swift`, `Makefile`, `Info.plist` (`LSUIElement`,
  `NSAccessibilityUsageDescription`), entitlements, self-signed identity setup
  documented in `README.md`.
- `FloatingPanel`: `NSPanel` subclass per the research doc's window config,
  hosting a SwiftUI view; menu bar item toggles show/hide; `.accessory`
  activation policy.
- `PermissionGate`: checks `AXIsProcessTrusted`, shows a banner with a button
  that opens Privacy & Security → Accessibility, re-checks on app activation.

*Verify:* `make mac-run`; panel sits above Safari including full screen; caret
keeps blinking in TextEdit while clicking the panel; app absent from Dock and
Mission Control; rebuild twice and confirm permission survives (D4).

### M2 — Tokens and key components

- Tests: `Metrics` returns the specified size for each key kind; `KeyboardStyle`
  returns the right row tint for Rainbow and a uniform tint for Mono; dual-key
  label pair resolves.
- Views: `KeyStandard`, `KeySpecial`, `KeyFunction`, `KeyDual`,
  `ShortcutButton`, `ShortcutFull` — each pressed/normal state, all tokens from
  `Tokens.swift`, no literals in views.
- A `--gallery` launch flag renders the component library screen.

*Verify:* `swift test` green; gallery screenshot compared side by side with
`component-library.png` from the issue.

### M3 — Keyboard and panel assembly

- Tests: layout model — function row is esc + F1–F12; number row is 13 dual keys
  `` ` `` through `=`; QWERTY/home/bottom rows contain the right keys in order;
  special key widths make each row sum to 980pt; edit keypad has the 12
  shortcuts from the issue in 2 columns × 6 rows.
- Views: `LeftKeypad` (EDIT), `MainKeyboard`, `RightKeypad` (NAVIGATE + SYSTEM),
  `AppShortcutsPanel`, `InputBar` (search icon, echo text, cursor, clear), mode
  buttons (Type active, Talk, Write, Settings — non-Type modes inert this phase).
- `KeyboardAssembly` composes them at the mock's proportions.

*Verify:* `swift test` green; running app compared against
`keyboard-dark-rainbow.png` and `keyboard-dark-mono.png`; style switch flips
both variants live.

### M4 — Input engine

- Tests (pure, no CGEvent): `KeyCodeMap` resolves `a`, `A`, `$`, `⌘` combos to
  the expected virtual key + flags on a stub layout; `ModifierState` — tap
  latches for exactly one key, double-tap locks until tapped again, caps lock
  latches independently, shift+letter yields uppercase; `Keystroke` sequence for
  a shortcut like ⇧⌘Z is ordered down-down-down-up-up-up; key repeat emits after
  the hold threshold and stops on release.
- `KeystrokeSink` protocol with a recording fake for tests; `CGEventSink` in the
  executable posts to `.cghidEventTap`.
- Input bar echo updates from the same keystroke stream; Return clears it.

*Verify:* type a sentence into TextEdit and Safari; ⌘C/⌘V/⌘Z/⇧⌘Z work; caps
lock and shift produce correct case; hold delete repeats; switch the system
input source to a non-US layout and confirm the map rebuilds.

### M5 — Shortcut panels as data

- Tests: panel JSON decodes into `PanelDefinition` with `typeText`,
  `pressKeys`, `openPanel` actions; unknown action type fails loudly; app lookup
  returns the per-app panel for a known bundle ID and the generic panel
  otherwise; `openPanel` switches the active panel.
- `PanelStore` loads bundled JSON; `NSWorkspace.didActivateApplicationNotification`
  swaps the app shortcuts panel; header shows app name + icon.

*Verify:* focus VS Code → its shortcuts appear; focus an unlisted app → generic
set; pressing a shortcut button performs it in that app.

### M6 — Accessibility pass

- Every key and shortcut: `accessibilityLabel` ("A", "Shift", "Copy, Command
  C"), `.isButton` trait, `accessibilityAction` wired to the same handler as the
  tap so `AXPress` works.
- Panels grouped as accessibility containers so Switch Control scans
  section → row → key.
- Hit targets ≥48pt confirmed; focus ring visible; `reduceMotion` respected.

*Verify:* Accessibility Inspector audit clean on every section; VoiceOver
announces each key; Switch Control scans and activates; Dwell Control clicks a
key; Voice Control "click Copy" works.

## Risks

| Risk | Mitigation |
|---|---|
| TCC revokes permission on rebuild, wrecking the dev loop | Stable signing identity from M1 (D4); documented in README |
| Some apps ignore synthetic events | `KeystrokeSink` is a protocol — add AppleScript and pasteboard fallbacks behind it if a target app fails |
| 980pt keyboard + two 200pt keypads exceeds a 13" display | Assembly reads a scale factor from the panel width in M3; ship at 1.0, verify at 0.8 |
| SwiftUI pointer handling swallows dwell clicks | M6 verifies with Dwell Control on real hardware, not just Inspector |

## Definition of done

Issue #10's acceptance criteria, minus predictions: keyboard floats over other
apps, types correctly into them, modifiers and shortcuts work, Rainbow and Mono
match the mocks, VoiceOver navigates every key — plus `swift test` green and a
notes file at `docs/notes/2026-07-27-mac-keyboard-panels.md`.
