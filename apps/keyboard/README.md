# Keyboard for macOS

A floating accessible keyboard that types into whatever app is in front, with
shortcut panels around it. Built with SwiftUI + AppKit, no dependencies.

```
Sources/
  SeptemberKit/     models, design tokens, views: everything testable
    Accessibility/  AXNode and AXTree (a snapshot of the tree of another app), AccessibilityPermission
    Design/         tokens, metrics, typography, rainbow and mono styles
    Keyboard/       key definitions, the QWERTY layout, KeyboardController, PressTracker
    Input/          modifiers, keystrokes, layout-aware key code map
    Panels/         panel model and JSON loading
    Views/          keys, shortcut buttons, panels, the assembled screen
    Resources/      Panels/{edit,navigate,system}.json, Panels/Apps/generic.json, Panels/Apps/<bundle id>.json
  Keyboard/         the app, which needs a running process
    AppDelegate.swift    menu bar item, panel setup, tree viewer refresh
    FloatingPanel.swift  the non-activating panel and its screen position
    CGEventSink.swift    posts keystrokes as CGEvents
    FocusWatcher.swift   follows the focused field and app switches
    AXElement.swift      reads attributes of an accessibility element
    AXTreeReader.swift   reads the accessibility tree of the app in front
    AXDump.swift         the --ax command
    Snapshot.swift       the --snapshot command
    main.swift           entry point
Tests/KitTests/     swift-testing suites (see "Tests" below)
```

## Commands

```sh
make run        # run unbundled in the foreground
make dev        # same, detached
make stop       # quit a running Keyboard
make test       # run the test suite
make app        # build and sign Keyboard.app
make dmg        # package Keyboard.app in an installable DMG
make open       # build, sign and launch
make snapshots  # render the keyboard and component library to .build/snapshots
```

Run them from `apps/keyboard/`. From the repo root, use `make mac-run`,
`mac-dev`, `mac-stop`, `mac-test`, `mac-app`, or `keyboard-dmg`.

`make run` and `make dev` launch Keyboard as a child of your shell, so it
inherits the terminal's Accessibility permission — keys type into other apps
with nothing to grant. The signed bundle from `make app` is a separate identity
and needs its own grant (below).

The app bundle uses `com.september.keyboard` as its identifier.

## Build the DMG

Run `make dmg` to build the signed app and create
`.build/release/Keyboard.dmg`. The disk image contains `Keyboard.app` and an
`Applications` shortcut.

The build uses the `Keyboard Dev` signing identity when it is available. If
the identity is missing, the app is signed ad hoc for local installation and
macOS resets its Accessibility permission after the next build.

## Render snapshots

Individual snapshots, for comparing against the design mocks without opening a
window:

```sh
swift run Keyboard --snapshot out.png            # the whole keyboard (rainbow)
swift run Keyboard --snapshot out.png --mono     # mono variant
swift run Keyboard --snapshot out.png --light    # light appearance
swift run Keyboard --snapshot out.png --gallery  # the component library
swift run Keyboard --snapshot out.png --viewer   # the tree viewer, reading the app in front
```

## The input bar

The bar above the keys mirrors the text field the user is typing into, read
back over the accessibility API with its caret and selection. Apps that expose
no text (Zed, a canvas, a page with nothing focused) fall back to an echo of
what Keyboard itself typed; password fields show nothing at all and leave no
copy behind. See `docs/concepts/input-mirroring.md`.

To see what Keyboard can read out of the app in front:

```sh
swift run Keyboard --ax            # the focused field, right now
swift run Keyboard --ax --wait 5   # after 5s, so you can click into another app
swift run Keyboard --ax --tree     # plus that app's accessibility tree
```

## The accessibility tree viewer

A second window sits at the right edge of the screen, the same height as the
keyboard, showing the accessibility tree of whatever app is in front — the tree
Keyboard itself reads to find the field it types into.

The viewer reads and opens only the branch that leads to the focused element.
Every other element shows as a shut row with a count of its children. The
element that gets the keystrokes is always the deepest row on screen. It follows
along as focus moves, as the frontmost app changes, on a slow timer, and from
its own refresh button.

Toggle it from the menu bar item (**Accessibility Tree**); the keyboard centres
in whatever space is left, so the two never overlap.

## Accessibility permission

Keyboard sends keystrokes with `CGEvent.post`, which macOS only allows to apps
the user has trusted in **System Settings ▸ Privacy & Security ▸ Accessibility**.
The app cannot be sandboxed for the same reason.

macOS grants that trust to a *(bundle id, code signature)* pair. Signing ad-hoc
mints a new signature on every build, so the permission is revoked each time you
rebuild. To keep it:

1. Keychain Access ▸ Certificate Assistant ▸ **Create a Certificate…**
2. Name `Keyboard Dev`, identity type *Self Signed Root*, certificate type
   **Code Signing**.
3. Rebuild. `make app` picks the identity up automatically.

Until permission is granted the keyboard still runs and shows a banner; keys
just do not reach other apps.

## Tests

The tests use swift-testing and live in `Tests/KitTests`. `make test` runs
`swift test`.

The tests cover keystroke dispatch, key repeat, controller state, input
mirroring, panels, and accessibility-tree behavior. They do not cover visual
tokens or exact layout measurements.

## Design system

Tokens, sizes and the two keyboard variants come from
[issue #10](https://github.com/sonnes/september/issues/10). Where the issue body
and the spec sheet disagree, the issue body wins.

The keyboard follows the system light/dark setting. Every token is a
`ThemeColor` — the issue's palette in the dark column, a derived one in the
light column — resolved against the appearance it is drawn in, with no setting
of its own.
