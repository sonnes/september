# September for macOS

A floating accessible keyboard that types into whatever app is in front, with
shortcut panels around it. Built with SwiftUI + AppKit, no dependencies.

```
Sources/
  SeptemberKit/     models, design tokens, views — everything testable
    Design/         tokens, metrics, rainbow/mono styles
    Keyboard/       key definitions, the QWERTY layout, the controller
    Input/          modifiers, keystrokes, layout-aware key code map
    Panels/         panel model + JSON loading
    Views/          keys, shortcut buttons, panels, the assembled screen
    Resources/      Panels/*.json and Panels/Apps/<bundle id>.json
  September/        the app: floating panel, CGEvent sink, menu bar, permission
Tests/KitTests/     tests (see "Tests" below)
```

## Commands

```sh
make run     # run unbundled — uses the terminal's Accessibility permission
make test    # run the test suite
make app     # build and sign September.app
make open    # build, sign and launch
```

Snapshots, for comparing against the design mocks without opening a window:

```sh
swift run September --snapshot out.png            # the whole keyboard (rainbow)
swift run September --snapshot out.png --mono     # mono variant
swift run September --snapshot out.png --gallery  # the component library
```

## Accessibility permission

September sends keystrokes with `CGEvent.post`, which macOS only allows to apps
the user has trusted in **System Settings ▸ Privacy & Security ▸ Accessibility**.
The app cannot be sandboxed for the same reason.

macOS grants that trust to a *(bundle id, code signature)* pair. Signing ad-hoc
mints a new signature on every build, so the permission is revoked each time you
rebuild. To keep it:

1. Keychain Access ▸ Certificate Assistant ▸ **Create a Certificate…**
2. Name `September Dev`, identity type *Self Signed Root*, certificate type
   **Code Signing**.
3. Rebuild. `make app` picks the identity up automatically.

Until permission is granted the keyboard still runs and shows a banner; keys
just do not reach other apps.

## Tests

Xcode is not installed on this machine, so SwiftPM has neither swift-testing nor
XCTest available. Tests are a plain executable with a ~40-line harness in
`Tests/KitTests/Harness.swift`, run with `make test`. Once Xcode is installed,
move the target to `.testTarget` and swap `test`/`expect` for `@Test`/`#expect` —
the test bodies barely change.

## Design system

Tokens, sizes and the two keyboard variants come from
[issue #10](https://github.com/sonnes/september/issues/10). Where the issue body
and the spec sheet disagree the issue body wins; see
`docs/notes/2026-07-27-mac-keyboard-panels.md`.
