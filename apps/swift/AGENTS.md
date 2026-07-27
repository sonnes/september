# September for macOS — agent guide

Native floating keyboard. SwiftUI + AppKit, SwiftPM, no third-party
dependencies. Read this before changing anything in `apps/swift/`; it augments
the root [CLAUDE.md](../../CLAUDE.md) (symlink of the root `AGENTS.md`) and
[apps/swift/README.md](README.md).

## Commands

```sh
make test       # tests — run before and after every change
make run        # run unbundled, inheriting the terminal's Accessibility permission
make dev        # same, detached; make stop to quit it
make app        # build + sign September.app (needs its own permission grant)
make open       # build, sign, launch
make snapshots  # keyboard + component library PNGs in .build/snapshots
```

Run them from `apps/swift/`, or `make mac-test` / `mac-run` / `mac-dev` /
`mac-app` / `mac-stop` from the repo root.

## Layout

| Path | Holds |
|---|---|
| `Sources/SeptemberKit/Accessibility` | `AXNode`/`AXTree` — another app's tree, snapshotted |
| `Sources/SeptemberKit/Design` | tokens, metrics, rainbow/mono styles |
| `Sources/SeptemberKit/Keyboard` | key definitions, QWERTY layout, `KeyboardController` |
| `Sources/SeptemberKit/Input` | modifiers, keystrokes, layout-aware key code map |
| `Sources/SeptemberKit/Panels` | panel model + JSON loading |
| `Sources/SeptemberKit/Views` | keys, shortcut buttons, panels, assembled screen |
| `Sources/SeptemberKit/Resources/Panels` | `*.json` panels, `Apps/<bundle id>.json` |
| `Sources/September` | app shell, `FloatingPanel`, `CGEventSink`, `FocusWatcher`, `AXTreeReader`, permission, snapshots |
| `Tests/KitTests` | tests + the harness |

Rule of thumb: **anything testable lives in `SeptemberKit`**. `September` holds
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
- **Every colour is a `ThemeColor`.** September follows the system appearance,
  so a token has a light value and a dark value, and `Color(_:)` resolves it
  against whatever is being drawn. Never pin an appearance on a window, and
  never add a token that fails the contrast checks in `DesignTests`. The dark
  column is issue #10's; the light column is derived — see
  `docs/notes/2026-07-27-mac-keyboard-panels.md`.
- **Design comes from [issue #10](https://github.com/sonnes/september/issues/10)**,
  not from the root `DESIGN.md` (that one governs the web app). Do not invent
  colours or sizes; where sources conflict, follow
  `docs/notes/2026-07-27-mac-keyboard-panels.md`.
- **Every interactive element is an accessibility element** with a spoken label,
  `.isButton`, and an `accessibilityAction` wired to the same handler as the
  tap. Dwell, Switch Control and Voice Control drive the app through `AXPress`;
  a control that only responds to `onTapGesture` is unusable for our users.
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
  The action vocabulary (`shortcut` / `text` / `openPanel`) deliberately mirrors
  Apple's `.ascconfig` panels — see
  `docs/research/2026-07-27-macos-accessibility-keyboard.md`.
- **Keep Swift 6 concurrency clean.** UI and controller are `@MainActor`; sinks
  crossing into CoreGraphics are `@unchecked Sendable` with a comment saying
  why. Do not silence warnings any other way.

## Gotchas

- Accessibility permission is bound to *(bundle id, code signature)*. Ad-hoc
  signing revokes it on every rebuild — create the `September Dev` certificate
  (README) before wondering why keys stopped working.
- Never prompt for permission at launch; the banner and the menu item ask.
- Key code mapping goes through `UCKeyTranslate`, never a hardcoded US table,
  and rebuilds when the input source changes.
- `--snapshot` renders without opening a window; use it to check layout against
  the mocks instead of asking someone to look at their screen. `--ax` prints the
  focused field September would mirror — reach for it before guessing why an app
  shows nothing.
- Read focus from the **frontmost app's** element, not the system-wide one: the
  system-wide `AXFocusedUIElement` returns nothing whenever the key window and
  `NSWorkspace.frontmostApplication` disagree. Details and the per-app coverage
  table: `docs/research/2026-07-27-reading-the-focused-field.md`.
- A locked screen makes every accessibility read collapse to `AXApplication`.
  Nothing probed then means anything.
- `ImageRenderer` draws nothing inside a `ScrollView` — that is why
  `AXTreeView` takes a `scrolls` flag and `--snapshot --viewer` passes `false`.
- Two windows now share the screen's bottom edge. The keyboard centres in the
  space left after `reservedWidth`; both take the same margin, which is what
  keeps their heights and baselines matched.
