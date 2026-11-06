# Keyboard for macOS

A floating accessible keyboard that types into whatever app is in front, with
shortcut panels around it. It predicts sentences and words, speaks text
aloud, and has a Talk mode and a Write window. Built with SwiftUI + AppKit, no
dependencies.

```
Sources/
  SeptemberKit/     models, design tokens, views — everything testable
    Accessibility/  another app's tree as a snapshot, the Accessibility permission
    Design/         tokens, metrics, typography, rainbow/mono styles
    Keyboard/       key definitions, the QWERTY layout, the controller
    Input/          modifiers, keystrokes, layout-aware key code map
    Integration/    the session that joins the parts, panel placement, the app in front
    Panels/         panel model, JSON loading, app panel ranking and learning
    Predictions/    sentence predictions and word completions
    Speech/         the voice: macOS voices, Personal Voice, ElevenLabs
    Talk/           Talk mode, the Said list, the Phrases panel
    UserPanel/      My Panel, private text, the Accessibility Keyboard import
    Settings/       the pages of the Settings window
    Write/          the documents and the editor bridge of the Write window
    Views/          keys, shortcut buttons, panels, the keyboard screen, the views of each part
    Resources/      Panels/{edit,text,system,phrases}.json, Panels/Apps/generic.json, Panels/Apps/<bundle id>.json
  Keyboard/         the app: floating panels, CGEvent sink, focus watcher, chord tap, tree reader,
                    menu bar, the Settings and Write windows
Tests/KitTests/     tests (see "Tests" below)
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

`make run` and `make dev` show the keyboard on your screen. When you are done,
run `make stop`.

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

## The windows

The keyboard window holds the sentence predictions, the input bar, and the
keys. A row of word completions sits on top of the keys. Speak, Type, Talk,
Write, and Settings are at the right of the input bar.

The Edit, Text, and System keypads and the app panel float in windows of their
own. By default they sit beside the keys. To move a panel, drag it by the grip
at its top. The keyboard keeps the place of each panel for the next launch.
The keyboard window and the panels never take focus.

The app panel has two tabs. The first tab shows the panel of the app in front.
The second tab, Mine, shows the buttons that the user made on the My Panel page
of Settings.

In Talk mode, the keys type into the input bar of the keyboard, and other apps
get no keys. The shortcut panels hide. Phrases show at the left of the keys,
and the Said list shows at the right. Speak reads the bar aloud and adds it to
the Said list.

Write opens the Write window, a normal macOS window with a Markdown editor.
Settings opens the Settings window. Both windows take focus. The menu bar item
also opens them.

## Render snapshots

Individual snapshots, for comparing against the design mocks without opening a
window:

```sh
swift run Keyboard --snapshot out.png            # Type mode in Messages, with the panels beside the keys
swift run Keyboard --snapshot out.png --talk     # Talk mode during speech
swift run Keyboard --snapshot out.png --write    # the Write window in front
swift run Keyboard --snapshot out.png --mine     # the Mine tab of the app panel
swift run Keyboard --snapshot out.png --mono     # mono variant
swift run Keyboard --snapshot out.png --gallery  # the component library
swift run Keyboard --snapshot out.png --viewer   # the tree viewer, reading the app in front
```

The keyboard snapshots use sample text. They read nothing from your apps.

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

It opens collapsed: only the branch leading to the focused element is unfolded,
and everything else shows as a shut row with a count of what it is holding, so
the element being typed into is always the deepest thing on screen. It follows
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

## Input Monitoring

The keyboard learns the shortcuts that you press with its own keys. To learn
from the hardware keyboard too, it needs Input Monitoring. The keyboard does
not ask for it at launch.

1. Open Settings, then the App Panels page.
2. Click Open Input Monitoring Settings.
3. Turn on Keyboard in the list.
4. Quit the keyboard and open it again.

## Stored data

The Keychain holds the secrets:

- The ElevenLabs key is in the service `com.september.keyboard`, account
  `elevenlabs`.
- If the September desktop app has a key in `com.september.desktop`, Settings
  can copy it. macOS asks one time before the keyboard reads it.
- The text of each private text button is in the service
  `com.september.keyboard.private`.

The Write window keeps each document as a Markdown file in
`~/Documents/September`. My Panel, the use counts, and the learned shortcuts
are JSON files in `~/Library/Application Support/September Keyboard`.

## Tests

Tests are a plain executable with a ~40-line harness in
`Tests/KitTests/Harness.swift`. Run them with `make test`. Xcode is installed
now, so swift-testing is available. To move to it, change the target to
`.testTarget` and replace `test`/`expect` with `@Test`/`#expect`. The test
bodies change very little.

The tests cover keystroke dispatch, controller state, input mirroring, panels,
accessibility-tree behavior, and each part of the keyboard. The wiring between
the parts is in `Tests/KitTests/IntegrationTests.swift`. Visual tokens and exact layout measurements
are reviewed outside the executable suite.

## Design system

Tokens, sizes and the two keyboard variants come from
[issue #10](https://github.com/sonnes/september/issues/10). Where the issue body
and the spec sheet disagree, the issue body wins.

The keyboard follows the system light/dark setting. Every token is a
`ThemeColor` — the issue's palette in the dark column, a derived one in the
light column — resolved against the appearance it is drawn in, with no setting
of its own.
