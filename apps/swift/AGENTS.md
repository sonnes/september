# September for macOS — agent guide

Native floating keyboard. SwiftUI + AppKit, SwiftPM, no third-party
dependencies. Read this before changing anything in `apps/swift/`; it augments
the root [CLAUDE.md](../../CLAUDE.md) (symlink of the root `AGENTS.md`) and
[apps/swift/README.md](README.md).

## Commands

```sh
make test    # tests — run before and after every change
make run     # run unbundled (uses the terminal's Accessibility permission)
make app     # build + sign September.app
make open    # build, sign, launch
swift run September --snapshot out.png [--mono] [--gallery]
```

Run them from `apps/swift/`, or `make mac-test` / `mac-run` / `mac-app` from the
repo root.

## Layout

| Path | Holds |
|---|---|
| `Sources/SeptemberKit/Design` | tokens, metrics, rainbow/mono styles |
| `Sources/SeptemberKit/Keyboard` | key definitions, QWERTY layout, `KeyboardController` |
| `Sources/SeptemberKit/Input` | modifiers, keystrokes, layout-aware key code map |
| `Sources/SeptemberKit/Panels` | panel model + JSON loading |
| `Sources/SeptemberKit/Views` | keys, shortcut buttons, panels, assembled screen |
| `Sources/SeptemberKit/Resources/Panels` | `*.json` panels, `Apps/<bundle id>.json` |
| `Sources/September` | app shell, `FloatingPanel`, `CGEventSink`, permission, snapshots |
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
  the mocks instead of asking someone to look at their screen.
