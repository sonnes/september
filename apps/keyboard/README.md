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
    Write/          the documents, the editor bridge, and the spoken text of the Write window
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
keys. A row of up to eight word completions sits on top of the keys. Speak, Type, Talk,
Write, and Settings are at the right of the input bar. In Type mode, Arrange
is between Write and Settings.

The word row shows the candidates of macOS, the words of the QuickType bar.
The candidates use the words before the caret. In a word, they complete the
word. At the start of the text, after a space, or after a mark, they give the
next word. After a mark with no space, a press types a space before the word.

When you press Return, or Speak in Talk mode, the keyboard tells macOS which
picked words the text still holds. macOS learns from these responses. Private
text and password fields send nothing.

The Edit, Text, and System keypads and the app panel float in windows of their
own. By default they sit beside the keys. To move the keyboard window or a
panel, drag it by the grip at its top. A drag does not take focus from the app
in front. The keyboard keeps the place of each window for the next launch. If
a saved place is on no screen, the window goes back to its default place. The
keyboard window and the panels never take focus.

Arrange moves the panels back beside the keys, at the place where the keyboard
is now. The menu bar item has the same command, Arrange Panels. Text, System,
and the app panel go to the left of the keys, with Text nearest the keys. Edit
goes to the right. If a panel does not fit on its side, it goes to the other
side. Each panel stays on the screen. `PanelPlacement.arrangedFrames` holds the rule.

The app panel has two tabs. The first tab shows the panel of the app in front.
The second tab, Mine, shows the buttons that the user made on the My Panel page
of Settings. The title of a keypad is as tall as the tabs of the app panel, so
the buttons of all the panels start at the same height. Edit, Text, and the
app panel end at the same height, in each app and in Mine.

In Talk mode, the keys type into the input bar of the keyboard, and other apps
get no keys. The shortcut panels hide. Phrases show at the left of the keys,
and the Said list shows at the right. Speak reads the bar aloud and adds it to
the Said list.

Write opens the Write window, a normal macOS window with a Markdown editor.
In the Write window, Speak reads the selection. If nothing is selected, Speak
reads the whole document without the Markdown marks. `MarkdownSpeech` holds
the rule. If the document has no text, Speak is off.

Settings opens the Settings window. Both windows take focus. The menu bar item
also opens them. After a press through `AXPress`, macOS refuses to activate
the keyboard. Then the window shows on top of the app in front, and it takes
the focus when the keyboard becomes active, for example after a click on the
window.

## Pressing and holding keys

The keys, the word row, the accents, and the buttons of the shortcut panels
act when the mouse button goes down. The prediction tiles, Speak, the mode
buttons, the tabs, and the Said list act when the button goes up, so a slide
off the control cancels the press. A press through `AXPress` (Dwell, Switch
Control, Voice Control) acts at once.

A held key obeys the keyboard settings of macOS. `KeyPresser` applies them,
and each press reads them again:

- Key repeat: Delete, Space, and the characters that are not letters repeat
  after the delay of System Settings, at its rate. If key repeat is off, no key
  repeats. The modifiers, Return, Escape, Tab, chords, and the shortcut buttons
  do not repeat.
- Press and hold: if `ApplePressAndHoldEnabled` is on (the macOS default), a
  held letter shows its accents over the word row and does not repeat. A press
  on an accent replaces the letter. A press on any key closes the accents. If
  the setting is off, a held letter repeats. The accents are in
  `Resources/Accents/en.json`, copied from the press and hold table of macOS.
- Slow Keys: if Slow Keys is on (System Settings, Accessibility, Keyboard), a
  key acts only after the user holds it for the acceptance delay. If the user
  lets go before the delay, nothing happens. The keyboard reads `slowKey` and
  `slowKeyDelay` from `com.apple.universalaccess`.
- Sticky Keys: one tap on a modifier latches it for the next key, a second tap
  locks it, and a third tap releases it, as Sticky Keys of macOS does.

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

In Type mode, the bar, the sentence predictions, and the word row show only
when there is text input. That is a focused text field, a password field, a
field with private text, or an echo in an app that exposes no focused element.
A selection in a web page that the user only reads is not text input. The bar
shows at once. When the text input goes away, the bar hides after 300 ms, so
a move from one field to the next does not make it blink. The hidden parts
keep their space, so the keys do not move. In Talk mode and in the Write
window, the bar always shows. `InputBarVisibility` holds the rule.

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
