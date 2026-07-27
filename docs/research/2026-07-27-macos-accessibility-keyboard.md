---
title: macOS Accessibility Keyboard — how it actually works
description: Ground-truth notes on Apple's Accessibility Keyboard, its .ascconfig panel format, action model, and the injection/permission machinery a replacement app must reproduce.
date: 2026-07-27
---

# macOS Accessibility Keyboard — how it actually works

Notes taken by inspecting macOS 26.5.2 (Darwin 25.5.0) on this machine, not from
memory. Every path and schema key below was read off disk.

## 1. What ships in the OS

| Piece | Path | Role |
|---|---|---|
| Accessibility Keyboard agent | `/System/Library/CoreServices/KeyboardAccessAgent.app` | Draws the on-screen keyboard and hosts panels |
| Assistive control engine | `/System/Library/PrivateFrameworks/AssistiveControlSupport.framework` | Panel model, shipped templates, Panel Editor support |
| Dwell Control | `/System/Library/CoreServices/Dwell Control.app` | Pointer-dwell clicking, separate process |

One engine drives three features — Accessibility Keyboard, Switch Control, Dwell
Control. They differ only in which panel set they load. Turned on in
System Settings → Accessibility → Keyboard → Accessibility Keyboard; custom
panels are authored in the bundled **Panel Editor**.

## 2. Panels are data, not code

A panel set is a bundle with extension `.ascconfig`:

```
Something.ascconfig/
└── Contents/
    ├── Info.plist
    └── Resources/
        ├── PanelDefinitions.plist   # the whole model
        └── AssetIndex.plist         # image resources
```

Locations found on this machine:

- Shipped templates — `…/AssistiveControlSupport.framework/Versions/A/Resources/AllTemplates.ascconfig`
  (panel IDs: `AdvancedMouse`, `DwellHome`, `Empty`, `HomePanel`, `KeyboardNumeric`)
- Shipped system panels — `…/Resources/System.ascconfig` (`SwitchDock`, `Move`, `Mouse`, `Dwell Actions`)
- User panels — `~/Library/Application Support/com.apple.AssistiveControl/{switchControlUserPanels1,dwellControlUserPanels1}.ascconfig`

Dropping a well-formed `.ascconfig` in the user directory makes the panel appear
in the Accessibility Keyboard — no code, no signing, no API.

## 3. PanelDefinitions.plist schema (observed keys)

Top level: `Panels` → dict keyed by panel ID (`USER.<uuid>` for user panels,
stable strings like `HomePanel` for shipped ones).

**Panel:** `ID`, `Name` / `LocalizedName`, `DisplayOrder`, `ScreenPosition`,
`HasTransientPosition`, `GlidingLensSize`, `ProductSupportType`,
`ShowPanelLocationString`, chrome flags (`HideHome`, `HideMinimize`,
`HideTitlebar`, `HideSwitchDock`, `HideSwitchDockContextualButtons`,
`HidePanelAdjustments`), `PanelObjects[]`.

**PanelObject:** `PanelObjectType` (`Button` | `Group`), `ID` (`Button.<uuid>`),
`Rect` as a string `"{{x, y}, {w, h}}"`, `DisplayText` / `LocalizedDisplayText`,
`DisplayImageResource` (+ `IsTemplate`, `Weight`), `DisplayTextPosition`,
`DisplayTextLocation`, `DisplayTextSize`, `FontSize`, `ButtonType`,
`ParentGroupID`, `PositionIndex`, `IsRadioGroup`, `SpokenDescription`,
`DwellAction`, `DwellIsSingleAction`, `AutoClick`, `Behavior`, `Actions[]`.

Layout is **absolute rects**, not a layout engine. Groups only nest logically.

**Action:** `ActionType` + `ActionParam` + `ActionRecordedOffset` (macro timing).

| ActionType | ActionParam | Meaning |
|---|---|---|
| `ActionPressKeyCharSequence` | `CharString`, `isStickyKey` | Type literal text; sticky = latch modifier |
| `ActionPressKeyCode` | `MacKeyCode`, `KeyboardHWID`, `Modifiers` (NSEvent flag bitmask), `UsesMacKeyCode` | One virtual keystroke |
| `ActionPerformKeyMacro` | `Events[]` of `ActionPressKeyCode` | Timed sequence — this is how ⌘C-style shortcuts are stored |
| `ActionOpenPanel` | `PanelID` | Navigate to another panel |
| `ActionMovePanel`, `ActionMouse`, `ActionMouseButton`, `ActionScroll`, `ActionDwell`, `ActionSystem`, `ActionPlaceholder` | — | Panel/pointer/system control |

Real shipped example (numeric keypad button):

```
Actions[0].ActionType   = ActionPerformKeyMacro
  .ActionParam.Events[0] = { ActionType: ActionPressKeyCode,
                             MacKeyCode: 83, Modifiers: 2097408,
                             KeyboardHWID: 46, UsesMacKeyCode: true }
Rect = "{{0, 0}, {35, 35}}"
```

A user panel on this machine stores text expansions the same way — buttons with
`ActionPressKeyCharSequence` and `CharString` set to the phrase.

**Consequence for us:** a "shortcuts panel" in Apple's model is nothing more
than a grid of buttons whose action is a key macro, a char sequence, or a jump
to another panel. That is exactly the model September's panels need.

## 4. What is worth copying

- Panel never takes focus. It floats above everything, the frontmost app keeps
  its caret, and keystrokes are injected into whatever is focused.
- Home panel → sub-panel navigation as a first-class action.
- Per-button dwell override and `SpokenDescription` (what VoiceOver/speech says).
- Sticky/latching modifiers (`isStickyKey`) — essential when the user has one
  pointer and cannot chord.
- Buttons are real accessibility elements, so Dwell, Switch Control, Head
  Tracking and Voice Control drive them for free.

## 5. What is worth diverging from

- Absolute `Rect` layout — brittle, no scaling, no dark/light theming.
- Panels are static: they never change with the frontmost app.
- Authoring means opening a modal Panel Editor and dragging rectangles.
- No prediction, no phrase bank, no styling control.

## 6. Can we render inside Apple's keyboard?

No. Third parties can only contribute *data* panels (`.ascconfig`). Custom
rendering, per-app panels, and predictions require our own floating window.
Optional later: export September panels to `.ascconfig` so they also work inside
Apple's keyboard for users who prefer it.

## 7. Injection and permissions (the parts that bite)

- **Non-sandboxed.** `CGEvent.post` + Accessibility permission are unavailable
  to sandboxed apps. Rules out the Mac App Store; accepted.
- **Permission:** `AXIsProcessTrustedWithOptions` with the prompt option.
  macOS 15+ re-asks periodically, so check on every activation, not just launch.
- **TCC is keyed to bundle ID + code signature.** Ad-hoc (`codesign -s -`)
  produces a new identity per build, so Accessibility permission is revoked on
  every rebuild. Fix: one stable self-signed identity in the login keychain, one
  fixed bundle ID, one fixed app path.
- **Injection:** `CGEvent(keyboardEventSource:virtualKey:keyDown:)`, set
  `.flags` for modifiers, `post(tap: .cghidEventTap)`. For literal text,
  `keyboardSetUnicodeString`. Fallbacks if a target app rejects synthetic
  events: AppleScript `keystroke` (needs Automation), then pasteboard + ⌘V.
- **No need to track the target app.** Because the panel is non-activating, the
  frontmost app never changes; posting to the HID tap lands in the right place.
- **Keyboard layout:** don't hardcode US QWERTY. Build the char → (virtual key,
  modifiers) map at runtime from `TISCopyCurrentKeyboardLayoutInputSource` +
  `UCKeyTranslate`, and rebuild it when the input source changes.
- **Window config that actually stays out of the way:**
  `NSPanel` with `.nonactivatingPanel`, `isFloatingPanel = true`,
  `becomesKeyOnlyIfNeeded = true`, `hidesOnDeactivate = false`,
  `level = .floating`, collection behavior
  `[.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]`, and
  `NSApp.setActivationPolicy(.accessory)` so there is no Dock icon or menu bar
  takeover.
- **Known trap:** a CGEvent tap goes silently dead after re-signing; relaunch
  after any signing change.

## 8. Assistive tech we integrate with rather than build

Dwell Control, Head Tracking, Switch Control and Voice Control are OS features.
Our only job: every key and shortcut is a real AX element with a label, an
`AXPress` action, a sane hit target (≥48pt already per the design system), and a
sensible scan grouping.

## Sources

- System paths listed above, read on 2026-07-27.
- Issue [sonnes/september#10](https://github.com/sonnes/september/issues/10) — design system for the keyboard.
- NSHipster, *Accessibility Keyboard* — panel format background.
