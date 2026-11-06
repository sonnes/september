# Keyboard for macOS — agent guide

Native floating keyboard. SwiftUI + AppKit, SwiftPM, no third-party
dependencies. Read this before changing anything in `apps/keyboard/`; it augments
the root [CLAUDE.md](../../CLAUDE.md) (symlink of the root `AGENTS.md`) and
[apps/keyboard/README.md](README.md).

## Commands

```sh
make test       # tests — run before and after every change
make run        # run unbundled, inheriting the terminal's Accessibility permission
make dev        # same, detached; make stop to quit it
make app        # build + sign Keyboard.app (needs its own permission grant)
make dmg        # package Keyboard.app with an Applications shortcut
make open       # build, sign, launch
make snapshots  # keyboard (Type, Talk, Write, Mine) + component library PNGs in .build/snapshots
```

Run them from `apps/keyboard/`, or `make mac-test` / `mac-run` / `mac-dev` /
`mac-app` / `keyboard-dmg` / `mac-stop` from the repo root.

## Layout

| Path | Holds |
|---|---|
| `Sources/SeptemberKit/Accessibility` | `AXNode`/`AXTree` (another app's tree, snapshotted), `AccessibilityPermission` |
| `Sources/SeptemberKit/Design` | tokens, metrics, typography, rainbow/mono styles |
| `Sources/SeptemberKit/Keyboard` | key definitions, QWERTY layout, `KeyboardController` |
| `Sources/SeptemberKit/Input` | modifiers, keystrokes, layout-aware key code map, the key settings of macOS (`KeyTiming`) and the timing of a held key (`KeyPresser`) |
| `Sources/SeptemberKit/Integration` | `KeyboardSession` (joins the parts), `SpeakText`, `FrontAppTracker`, `PanelPlacement` |
| `Sources/SeptemberKit/Panels` | panel model, JSON loading, app panel ranking and learning |
| `Sources/SeptemberKit/Predictions` | sentence predictions (Apple Intelligence) and word completions |
| `Sources/SeptemberKit/Speech` | `Speaker`, the macOS voices, ElevenLabs, the Keychain store |
| `Sources/SeptemberKit/Talk` | Talk mode, the Said list, the Phrases panel |
| `Sources/SeptemberKit/UserPanel` | My Panel, private text, the Accessibility Keyboard import |
| `Sources/SeptemberKit/Settings` | the Settings pages and `KeyboardSettings` |
| `Sources/SeptemberKit/Write` | the document library and the editor bridge of the Write window |
| `Sources/SeptemberKit/Views` | keys, shortcut buttons, panels, the keyboard screen, and the views of each part |
| `Sources/SeptemberKit/Resources/Panels` | `edit`/`text`/`system`/`phrases.json`, `Apps/generic.json`, `Apps/<bundle id>.json` |
| `Sources/SeptemberKit/Resources/Accents` | the accents of a held letter, by language (`en.json`) |
| `Sources/Keyboard` | app shell, `FloatingPanel`, `CGEventSink`, `FocusWatcher`, `ChordTap`, `MenuBarReader`, `AXTreeReader`, the Settings and Write windows, snapshots |
| `Tests/KitTests` | tests + the harness |

Rule of thumb: **anything testable lives in `SeptemberKit`**. `Keyboard` holds
only what needs a running app — the panel, the event sink, the menu bar.

## Rules

- **TDD, strictly.** Write the failing check first, then the smallest code that
  passes it. Every model change lands with a test in `Tests/KitTests`.
- **Tests are an executable, not `swift test`.** Add checks with
  `test("…") { expect(…) }` and register the suite in
  `Tests/KitTests/main.swift`. Xcode is installed now, so swift-testing is
  available. The move to swift-testing is not done yet.
- **No literals in views.** Colours come from `Tokens`, sizes from `Metrics`,
  fonts from `Typography`. New values go in the design layer first.
- **Every colour is a `ThemeColor`.** Keyboard follows the system appearance,
  so a token has a light value and a dark value, and `Color(_:)` resolves it
  against whatever is being drawn. Never pin an appearance on a window. The
  dark column is issue #10's; the light column is derived from it.
- **Design comes from [issue #10](https://github.com/sonnes/september/issues/10)**,
  not from the root `DESIGN.md` (that one governs the web app). Do not invent
  colours or sizes.
- **Every interactive element is an accessibility element** with a spoken label,
  `.isButton`, and an `accessibilityAction` wired to the same handler as the
  tap. The `pressable` view modifier does all of this. Dwell, Switch Control
  and Voice Control drive the app through `AXPress`; a control that only
  responds to `onTapGesture` is unusable for our users.
- **Keys and panel buttons act when the button goes down.** Give them
  `pressable(trigger: .down(...))`. `KeyPresser` applies Slow Keys, key repeat,
  and press and hold. Do not put a timer in a view. Controls that open a
  window, change the mode, speak, or type a whole sentence keep `.up`, so the
  user can slide off to cancel.
- **The keyboard window and the shortcut panels never take focus.** Do not add
  text fields to them, do not set `canBecomeKey`, and do not activate the app
  from them. Everything the user types goes to the app in front. Only the
  Write and Settings windows take focus. To open one of them, call
  `AppActivation.bringToFront()`.
- **A floating window has no title bar.** `FloatingPanel` is borderless. A
  title bar gives the hosting view a safe area, and then the content jumps up
  and down as it changes.
- **Wire the parts through `KeyboardSession`.** The session feeds the
  predictions from the input bar, empties the Talk bar when the speech ends,
  counts the presses of the panels, and ranks My Panel. Put new wiring there,
  with a check in `Tests/KitTests/IntegrationTests.swift`. `AppDelegate` keeps
  only what needs a running app.
- **Private text stays private.** Never log, print, or keep the text of a
  field, a private text button, or an API key. While `isFieldPrivate` is true,
  the predictions, Speak, learning, and the tree viewer get no text of the
  field. Call `KeyboardSession.focusMoved()` only when the focused element
  changes, not when its value changes.
- **An app switch is one ordered step.** `FocusWatcher.onAppChanged` clears the
  last app's text through `KeyboardSession.appChanged` *before* the new app's
  field is read. Do not observe `didActivateApplication` anywhere else: two
  observers of one notification cannot promise that order, and the bar ends up
  stuck empty. The Write window belongs to the keyboard process, so
  `FrontAppTracker` decides between the Write window and another app. It
  matches apps on the process ID.
- **The input bar is a mirror, not a buffer.** It shows the focused field's own
  text (`InputMirror.mirrored`), our echo only when the app exposes none, and
  nothing for a password field. Never keep text typed into an
  `AXSecureTextField`. See `docs/concepts/input-mirroring.md`.
- **Panels are data.** New shortcuts are JSON in `Resources/Panels`, not Swift.
  A button presses a `shortcut`, presses a `sequence` of shortcuts, or types
  `text`. The file name is the panel's identity: an app panel is
  `Apps/<bundle id>.json`. `PanelStore` throws on a missing or broken file,
  and the app shows the error and quits.
- **Keep Swift 6 concurrency clean.** UI and controller are `@MainActor`; sinks
  crossing into CoreGraphics are `@unchecked Sendable` with a comment saying
  why. Do not silence warnings any other way.

## Gotchas

- Accessibility permission is bound to *(bundle id, code signature)*. Ad-hoc
  signing revokes it on every rebuild — create the `Keyboard Dev` certificate
  (README) before wondering why keys stopped working.
- Never prompt for permission at launch. The banner and the menu item ask for
  Accessibility. The App Panels page of Settings asks for Input Monitoring.
- Key code mapping goes through `UCKeyTranslate`, never a hardcoded US table,
  and rebuilds when the input source changes.
- `--snapshot` renders without opening a window; use it to check layout against
  the mocks instead of asking someone to look at their screen. `--ax` prints the
  focused field Keyboard would mirror — reach for it before guessing why an app
  shows nothing.
- Read focus from the **frontmost app's** element, not the system-wide one: the
  system-wide `AXFocusedUIElement` returns nothing whenever the key window and
  `NSWorkspace.frontmostApplication` disagree.
- A locked screen makes every accessibility read collapse to `AXApplication`.
  Nothing probed then means anything.
- `ImageRenderer` draws nothing inside a `ScrollView` — that is why
  `AXTreeView` takes a `scrolls` flag and `--snapshot --viewer` passes `false`.
- `ImageRenderer` draws an AppKit view (`NSViewRepresentable`) as a yellow
  box. A view that holds one leaves it out when `isSnapshot` is true, as the
  grip does with its drag area.
- A floating window moves only by its grip. The grip calls `performDrag`, so a
  window that never becomes key moves too. `isMovableByWindowBackground` is
  off, so a press on a key never moves the window.
- `ImageRenderer` puts a grey layer over the whole view when the view holds
  an app icon from `NSWorkspace`. Draw the icon into a small bitmap first
  with `tabIcon()`.
- Keyboard is an accessory app. A press through `AXPress` does not activate
  it, so `NSApp.activate()` alone leaves a new window behind the app in front.
- `make run` and `make dev` show the keyboard on the screen of the user. Stop
  it with `make stop` when the check is done.
- The keyboard window, the tree viewer, and the default places of the shortcut
  panels share the bottom margin of the screen. The keys and the panels
  centre in the space left after `reservedWidth`. `PanelPlacement` puts the
  panels beside the keys, with their tops in line with the top of the keys.
