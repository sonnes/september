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
make snapshots  # keyboard + component library PNGs in .build/snapshots
```

Run them from `apps/keyboard/`, or `make mac-test` / `mac-run` / `mac-dev` /
`mac-app` / `keyboard-dmg` / `mac-stop` from the repo root.

## Layout

| Path | Holds |
|---|---|
| `Sources/SeptemberKit/Accessibility` | `AXNode`/`AXTree` (another app's tree, snapshotted), `AccessibilityPermission` |
| `Sources/SeptemberKit/Design` | tokens, metrics, rainbow/mono styles |
| `Sources/SeptemberKit/Keyboard` | key definitions, QWERTY layout, `KeyboardController` |
| `Sources/SeptemberKit/Input` | modifiers, keystrokes, layout-aware key code map |
| `Sources/SeptemberKit/Panels` | panel model + JSON loading |
| `Sources/SeptemberKit/Views` | keys, shortcut buttons, panels, assembled screen |
| `Sources/SeptemberKit/Resources/Panels` | `edit`/`navigate`/`system.json`, `Apps/generic.json`, `Apps/<bundle id>.json` |
| `Sources/Keyboard` | app shell, `FloatingPanel`, `CGEventSink`, `FocusWatcher`, `AXTreeReader`, `AXElement` reads, snapshots |
| `Tests/KitTests` | tests + the harness |

Rule of thumb: **anything testable lives in `SeptemberKit`**. `Keyboard` holds
only what needs a running app — the panel, the event sink, the menu bar.

## Rules

- **TDD, strictly.** Write the failing check first, then the smallest code that
  passes it. Every model change lands with a test in `Tests/KitTests`.
- **Tests are an executable, not `swift test`.** Xcode is not installed, so
  SwiftPM has no test framework. Add checks with `test("…") { expect(…) }` and
  register the suite in `Tests/KitTests/main.swift`. Swap to swift-testing only
  once Xcode is present.
- **No literals in views.** Colours come from `Tokens`, sizes from `Metrics`.
  New values go in the design layer first.
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
- **The panel must never take focus.** Do not add text fields, do not set
  `canBecomeKey`, do not activate the app. Everything the user types goes to the
  app in front.
- **An app switch is one ordered step.** `FocusWatcher.onAppChanged` clears the
  last app's text through `KeyboardController.appChanged` *before* the new app's
  field is read. Do not observe `didActivateApplication` anywhere else: two
  observers of one notification cannot promise that order, and the bar ends up
  stuck empty.
- **The input bar is a mirror, not a buffer.** It shows the focused field's own
  text (`InputMirror.mirrored`), our echo only when the app exposes none, and
  nothing for a password field. Never keep text typed into an
  `AXSecureTextField`. See `docs/concepts/input-mirroring.md`.
- **Panels are data.** New shortcuts are JSON in `Resources/Panels`, not Swift.
  A button either presses a `shortcut` or types `text`. The file name is the
  panel's identity: an app panel is `Apps/<bundle id>.json`. `PanelStore`
  throws on a missing or broken file, and the app shows the error and quits.
- **Keep Swift 6 concurrency clean.** UI and controller are `@MainActor`; sinks
  crossing into CoreGraphics are `@unchecked Sendable` with a comment saying
  why. Do not silence warnings any other way.

## Gotchas

- Accessibility permission is bound to *(bundle id, code signature)*. Ad-hoc
  signing revokes it on every rebuild — create the `Keyboard Dev` certificate
  (README) before wondering why keys stopped working.
- Never prompt for permission at launch; the banner and the menu item ask.
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
- Two windows share the screen's bottom edge. The keyboard centres in the
  space left after `reservedWidth`; both take the same margin, which is what
  keeps their heights and baselines matched.
