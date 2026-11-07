# Keyboard for macOS

A floating accessible keyboard that types into whatever app is in front, with
shortcut panels around it. It predicts sentences and words, speaks text
aloud, and has a Talk mode and a Write window. Built with SwiftUI + AppKit, no
dependencies.

```
Sources/
  SeptemberKit/     models, design tokens, views — everything testable
    Accessibility/  another app's tree as a snapshot, the Accessibility permission
    Clipboard/      the clipboard history and the watcher of the clipboard
    Design/         tokens, metrics, typography, rainbow/mono styles
    Keyboard/       key definitions, the QWERTY layout, the controller
    Input/          modifiers, keystrokes, layout-aware key code map
    Integration/    the session that joins the parts, panel placement, the app in front
    Panels/         panel model, JSON loading, app panel ranking and learning
    Predictions/    sentence predictions and word completions
    ScreenContext/  the text near the focused field, and the rule of each app
    Speech/         the voice: macOS voices, Personal Voice, ElevenLabs
    Talk/           Talk mode, the Said list, the Phrases panel
    UserPanel/      My Panel, private text, the Accessibility Keyboard import
    Settings/       the pages of the Settings window
    Write/          the documents, the editor bridge, and the spoken text of the Write window
    Views/          keys, shortcut buttons, panels, the keyboard screen, the views of each part
    Resources/      Panels/{edit,text,system,phrases}.json, Panels/Apps/generic.json, Panels/Apps/<bundle id>.json,
                    Context/<bundle id>.json
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
keys. A row of word completions sits on top of the keys. Cut, Copy, Paste, and
History are at the left of the input bar. Speak, Type, Talk, Write, and
Settings are at the right of the input bar. In Type mode, Arrange is between
Write and Settings. The clipboard buttons and the input bar together are as
wide as the keys.

The word row shows the candidates of macOS, the words of the QuickType bar.
The candidates use the words before the caret. In a word, they complete the
word. At the start of the text, after a space, or after a mark, they give the
next word. After a mark with no space, a press types a space before the word.

The keyboard asks for up to 20 words. Each button is as wide as its word, and
the row shows the words that fit, best first. A word that does not fit is left
out, and a shorter word after it can take its place. A full row shares the
space at its end among the buttons. `WordRowFit` holds the rule.

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
is now. The menu bar item has the same command, Arrange Panels. System and the
app panel go to the left of the keys, with System nearest the keys. Text and
Edit go to the right, with Text nearest the keys. If a panel does not fit on
its side, it goes to the other side. Each panel stays on the screen.
`PanelPlacement.arrangedFrames` holds the rule.

The Text keypad has the arrow keys of a Mac keyboard at its bottom, as an
inverted T. Page Up and Page Down fill the two top corners of the T. The word,
line, and selection moves are in the grid above the arrows. The arrows are the
`arrows` block of `text.json`, with three columns, so the Text keypad is wider
than the other keypads.

The app panel has two tabs. The first tab shows the panel of the app in front.
The second tab, Mine, shows the buttons that the user made on the My Panel page
of Settings. The title of a keypad is as tall as the tabs of the app panel, so
the buttons of all the panels start at the same height. Edit, Text, and the
app panel end at the same height, in each app and in Mine.

In Talk mode, the keys type into the input bar of the keyboard, and other apps
get no keys. The shortcut panels hide. Phrases show at the left of the keys,
and the Said list shows at the right. Speak reads the bar aloud and adds it to
the Said list.

Talk mode keeps its own history, the Said list, in
`~/Library/Application Support/September Keyboard/talk-history.json`. No
other part of the keyboard uses this file. The history keeps each line for 30
days, and 1,000 lines at most. The sentence predictions of Talk mode use the
lines of the last hour. Type mode does not use the history. To clear it, open
Settings, then Speech, then click Clear Talk History. If the file does not
decode, the keyboard moves it to `talk-history.broken.json` and starts an
empty history.

Cut, Copy, and Paste press Command-X, Command-C, and Command-V in the app in
front. In Talk mode they act on the Talk bar: Copy copies its text, Cut also
clears it, and Paste types the clipboard into it. Cut and Copy are off when
the field shows no selection, and in a password field. If the app shows no
field, Cut and Copy stay on. Paste is off when the clipboard holds no text.

History shows the text that you copied, in the place of the sentence
predictions. A page shows six texts. The newest text is at the bottom left,
next to the input bar. A press on a text pastes it into the app in front, or
types it into the Talk bar in Talk mode. Then the predictions show again.

The clipboard history is in
`~/Library/Application Support/September Keyboard/clipboard-history.json`,
and only the user can read the file. The history keeps each text for 7 days,
and 200 texts at most. A copy of a text that is already in the history moves
it to the newest place. The history keeps no copy from a password manager, no
copy of a file, and no copy from a password field or a field with private
text. The Clipboard page of Settings turns the history off and clears it.
When the history is off, it keeps no texts. If the file does not decode, the
keyboard moves it to `clipboard-history.broken.json` and starts an empty
history.

Write opens the Write window, a normal macOS window with a Markdown editor.
The window grows out of the input bar and opens above the keyboard. By
default, the editor is a portrait page with the shape of A4 paper, as tall as
the space above the keyboard. If the user resizes the window, the window keeps
that size. If Reduce Motion is on, the window opens with no animation.
`WritePlacement` holds the rule. In the Write window, Speak reads the selection. If nothing is selected, Speak
reads the whole document without the Markdown marks. `MarkdownSpeech` holds
the rule. If the document has no text, Speak is off.

Settings opens the Settings window. Both windows take focus. The menu bar item
also opens them. After a press through `AXPress`, macOS refuses to activate
the keyboard. Then the window shows on top of the app in front, and it takes
the focus when the keyboard becomes active, for example after a click on the
window.

## Pressing and holding keys

The keys, the word row, the accents, the buttons of the shortcut panels, and
Cut, Copy, and Paste act when the mouse button goes down. The prediction
tiles, Speak, the mode buttons, History, the copied texts, the tabs, and the
Said list act when the button goes up, so a slide off the control cancels the
press. A press through `AXPress` (Dwell, Switch
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
swift run Keyboard --snapshot out.png --clipboard  # the clipboard history, open
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
swift run Keyboard --ax --context-shape --wait 5   # the shape of the text around the field
```

`--context-shape` prints each element of the window that has text or leads to
the focused field. It prints the shape of each text and none of its words: a
capitalized word is `W`, another word is `w`, and digits are `9`. `dy` is the
distance from the top of the field, and a negative `dy` is above it. Add
`--electron` to ask Chrome and Electron apps for their full tree first. The
probe prints 400 lines or fewer. To print more, add `--lines 3000`. The
probe also prints what the text on screen step reads, as shapes.

## Text on Screen

In Type mode, the sentence predictions can read the text near the focused
field, such as the messages of a chat. The switch is on the Predictions page
of Settings. It is off until the user turns it on. While it is off, the
keyboard reads nothing.

The keyboard reads the text when the focus moves, when another app comes to
the front, and when the field empties after a send. The read runs off the main
thread and stops after 300 ms. It keeps the newest 1,500 characters. The
keyboard never reads a password field or a field with private text, and it
never logs the text.

An app with a rule file gets an exact read. The rule is
`Sources/SeptemberKit/Resources/Context/<bundle id>.json`:

```json
{
  "name": "WhatsApp",
  "title": {"match": {"identifier": "NavigationBar_HeaderViewButton"}, "attribute": "description"},
  "conversation": {"identifier": "ChatMessagesTableView"},
  "message": {"match": {"identifier": "WAMessageBubbleTableViewCell"}, "attribute": "description"}
}
```

A match uses `identifier`, `role`, `subrole`, or more than one of them. An
`attribute` is `value`, `description`, `title`, or `placeholder`. The read
finds the first `conversation` element, then the text of each `message` in it.

An app with no rule file gets the general rule. The general rule reads the
static text that comes before the field in reading order. It skips navigation
landmarks, such as a sidebar, and the text of other fields.

To add a rule for an app:

1. Run `swift run Keyboard --ax --context-shape --wait 5`, and click into the
   field of the app.
2. In the output, find the identifier of the container and of each message.
3. Add `<bundle id>.json` with these identifiers.
4. Run the probe again. Make sure that the `extracted with the rule of` lines
   show the messages.

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
`~/Documents/September`. My Panel, the use counts, the learned shortcuts, and
the Talk history are JSON files in
`~/Library/Application Support/September Keyboard`. Only the user can read the
Talk history file.

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
