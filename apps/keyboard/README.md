# Keyboard for macOS

A floating accessible keyboard that types into whatever app is in front, with
shortcut panels around it. It predicts sentences and words, speaks text
aloud, and has a Talk mode and a Write paper. Built with SwiftUI + AppKit, no
dependencies.

```
Sources/
  SeptemberKit/     models, design tokens, views: everything testable
    Accessibility/  AXNode and AXTree (a snapshot of the tree of another app), AccessibilityPermission
    Clipboard/      the clipboard history and the watcher of the clipboard
    Design/         tokens, metrics, typography, rainbow and mono styles
    Keyboard/       key definitions, the QWERTY layout, KeyboardController, PressTracker
    Input/          modifiers, keystrokes, layout-aware key code map
    Integration/    the session that joins the parts, the assembly that builds it, panel placement, the app in front, the import of old JSON files
    Panels/         panel model, JSON loading, the grid of Mine and the Write panels, the shortcut suggestions
    Predictions/    sentence predictions and word completions
    ScreenContext/  the text near the focused field, and the rule of each app
    Speech/         the voice: macOS voices, Personal Voice, ElevenLabs
    Storage/        the keyboard database (keyboard.sqlite), the sentence history, and the text log
    Talk/           Talk mode, the Said list, the Phrases panel
    UserPanel/      My Panel, its use counts, private text, the Accessibility Keyboard import
    Settings/       the pages of the Settings window
    Write/          the documents of Write, `WriteController`, and the text that Speak reads
    WriteEditor/    the native Markdown editor and the Write paper
    Views/          keys, shortcut buttons, panels, the keyboard screen, the views of each part
    Resources/      Panels/{text,system,rectangle,phrases,write,write-documents}.json,
                    Context/<bundle id>.json
  Keyboard/         the app: floating panels, CGEvent sink, focus watcher, modifier tap, other input monitor, tree reader,
                    menu bar, the shared accessibility reads (AXFocus), the Settings window
  WriteLab/         the Write paper on its own, with a stand-in for the keyboard bar
Tests/KitTests/     tests (see "Tests" below)
```

## Commands

```sh
make run        # run unbundled in the foreground
make dev        # same, detached
make stop       # quit a running Keyboard
make test       # run the test suite
make app        # build and sign September Keyboard.app
make dmg        # package the app in an installable DMG
make release    # sign with Developer ID, notarize, staple, and check the app and the DMG
make publish    # upload the DMG of make release to a GitHub Release
make open       # build, sign and launch
make snapshots  # render the keyboard and component library to .build/snapshots
make lab        # run Write Lab, the native Write editor on its own
make landing-media  # render the screenshots and animations of the keyboard page of the web app
```

`make run` and `make dev` show the keyboard on your screen. When you are done,
run `make stop`.

Run them from `apps/keyboard/`. From the repo root, use `make mac-run`,
`mac-dev`, `mac-stop`, `mac-test`, `mac-app`, `keyboard-dmg`, or
`keyboard-release`.

`make run` and `make dev` launch Keyboard as a child of your shell, so it
inherits the terminal's Accessibility permission — keys type into other apps
with nothing to grant. The signed bundle from `make app` is a separate identity
and needs its own grant (below).

The app is September Keyboard, with the bundle identifier
`app.september.keyboard`. The version is `CFBundleShortVersionString` in
`Resources/Info.plist`.

The icon is a keyboard in the frame of the September mark
(`packages/app-ui/public/logo.svg`), so that it differs from the icon of the
desktop app. Its source is `Resources/AppIcon.svg`. After you change the SVG,
run `make icon` to make `Resources/AppIcon.icns`. The command needs
`rsvg-convert` (`brew install librsvg`).

## Build the DMG

Run `make dmg` to build the signed app and create
`.build/release/September-Keyboard-<version>.dmg`. The disk image contains
`September Keyboard.app` and an `Applications` shortcut.

The build uses the `Keyboard Dev` signing identity when it is available. If
the identity is missing, the app is signed ad hoc for local installation and
macOS resets its Accessibility permission after the next build.

## Release

A release is a DMG that anyone can open. The app and the DMG are signed with
a Developer ID, notarized by Apple, and stapled. Each one has its own ticket,
so the app opens without a network connection after the user copies it out of
the DMG.

`make release` reads the credentials of the desktop release from the `.envrc`
file in the repository root: `APPLE_SIGNING_IDENTITY`, `APPLE_API_KEY`,
`APPLE_API_ISSUER`, and `APPLE_API_KEY_PATH`. The file is not in git.

1. Set the new version in `CFBundleShortVersionString`, and increase
   `CFBundleVersion`, in `Resources/Info.plist`.
2. Add a `## <version>` section to `CHANGELOG.md`.
3. Run `make release`. In a worktree, which has no `.envrc`, run
   `make release ENVRC=<path to .envrc>`.
4. Open the DMG on a second Mac, or in a new user account, and do the checks in
   "Check a release" below.
5. Run `make publish`. It creates the GitHub Release `keyboard-v<version>` on
   `sonnes/september` with the DMG and the notes of `CHANGELOG.md`. A 0.x
   version is a pre-release, as the desktop releases are.

Notarization takes from 2 to 15 minutes for each of the two uploads. If Apple
rejects an upload, `make release` stops. Then run
`xcrun notarytool log <submission id>` with the same key to read the reason.

### Check a release

- Gatekeeper opens the app with no warning.
- The first launch shows the Accessibility banner. After you allow September
  Keyboard in System Settings, the keys type into another app.
- Settings opens, and Speak reads the input bar aloud.
- The Write paper opens and saves a document.

## The windows

The keyboard window holds the sentence predictions, the input bar, and the
keys. A row of word completions sits on top of the keys. Cut, Copy, Paste, and
History are at the left of the input bar. Speak, Type, Talk, Write, and
Settings are at the right of the input bar. In Type mode, Arrange is between
Write and Settings. The input bar is as wide as the keys and sits over them.
The clipboard buttons sit past the left edge of the keys, so the keyboard
window has a clear space at the left of the keys.

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

The sentence predictions show only after you type. When the focus comes to a
field, the stack stays empty until the text of the field changes. The text
before the caret must also hold a letter. An empty Talk bar shows no
sentence predictions. The word row does not wait.

The stack has three rows. The rows come from the sentence history and from
Apple Intelligence. History rows show at once. Up to two history rows come
first, then the rows of the model, and then the other history rows. A row
with the same words as an earlier row does not show. When Apple Intelligence
is not ready, the history rows still show, and its notice shows only when no
row matches.

When you press Return on the keys, or Speak in Talk mode, the keyboard splits
the paragraph at the caret into sentences. Each sentence goes into the history
in `~/Library/Application Support/September Keyboard/keyboard.sqlite`. Only
the user can read the file and its `-wal` and `-shm` files. A sentence that you send again gets one more use.
While you type, the history finds the sentences that start with the sentence
at the caret. It ranks them by their uses, and a use loses half its weight in
14 days. The history keeps 10,000 sentences at most, and removes the sentences
that you used least recently. It keeps nothing from a password field, from
private text, or from the Write window. Return on the hardware keyboard does
not add to the history. The Predictions page of Settings turns the history off
and clears it. When the history is off, it keeps no sentences. If the database
does not open, the keyboard moves it to `keyboard.broken.sqlite` and starts an
empty database.

The Text, System, and Rectangle keypads and My Panel float in windows
of their own. By default they sit beside the keys. To move the keyboard window or a
panel, drag it by the grip at its top. A drag does not take focus from the app
in front. The keyboard keeps the place of each window for the next launch. If
a saved place is on no screen, the window goes back to its default place. The
keyboard window and the panels never take focus. The panels show only in Type
mode. `DetachedPanel.isShown(in:)` holds the rule.

Arrange moves the panels back beside the keys, at the place where the keyboard
is now. The menu bar item has the same command, Arrange Panels. System and
My Panel go to the left of the keys, with System nearest the keys. Text and
Rectangle go to the right, with Text nearest the keys. If a panel does not fit on
its side, it goes to the other side. Each panel stays on the screen.
`PanelPlacement.arrangedFrames` holds the rule.

The Text keypad has the arrow keys of a Mac keyboard at its bottom, as an
inverted T. Page Up and Page Down fill the two top corners of the T. The word,
line, and selection moves are in the grid above the arrows. The arrows are the
`arrows` block of `text.json`, with three columns, so the Text keypad is three
buttons wide.

The System keypad has three columns. It holds Undo, Redo, Select All, Save,
New, Open, Print, and Close, and then Find, Mission Control, Scroll Up,
Scroll Down, the zoom keys, Full Screen, Screenshot, and Quit. No keypad
repeats Cut, Copy, or Paste.

Scroll Up and Scroll Down scroll the place where the pointer last rested
outside the keyboard, as the scroll menu of Dwell of macOS does. The pointer
rests when it stays still for 0.4 seconds, or where the user clicks.
`PointerRestTracker` finds that place from the global monitors of
`OtherInputMonitor`. A held scroll button repeats at the key repeat rate of
macOS. Each step is 40 pixels. `CGEventSink` posts the scroll to the app of
the window at that place, because the pointer is on the keyboard. The
scroll has no modifier flags, so a latched Shift does not turn it sideways.
The Shift stays latched for the next key. A scroll works in Talk mode too.
If the pointer has rested nowhere yet, the keyboard
beeps. In panel JSON, a scroll button is
`{"type": "scroll", "direction": "down"}`. The directions are `up`, `down`,
`left`, and `right`.

The Rectangle keypad presses the shortcuts of
[Rectangle](https://rectangleapp.com), the window manager. It shows only when
Rectangle is installed. It has three columns: the halves and Maximize, the
thirds, the two thirds and Center, the top corners and Top Half, the bottom
corners and Bottom Half, and then Smaller, Restore, and Larger. Each button
shows an icon in place of its keys: a small screen with the part of the
window filled, or an SF Symbol for Smaller, Restore, and Larger. The keys are
the recommended shortcuts of Rectangle (Control Option and a key). If the user
chose the Spectacle shortcuts or changed a shortcut in Rectangle, a button
presses the wrong keys.

My Panel shows Mine: the buttons that the user made on the My Panel page of
Settings. While Write is in front, My Panel has a second tab with the Write
keys. The title of a keypad is as tall as the tabs of My Panel, so the buttons
of all the panels start at the same height. System, Text, and My Panel end at
the same height.

The buttons of My Panel are in the `user_button` table of
`~/Library/Application Support/September Keyboard/keyboard.sqlite`. The text
of a private text button is in the Keychain, not in the table. The switch
"Make new text private" is in `UserDefaults`.

My Panel ranks its buttons by their presses. A press loses half its weight in
14 days. The presses are in the `button_use` table of
`~/Library/Application Support/September Keyboard/keyboard.sqlite`. The table
holds button IDs, not text.

In Talk mode, the keys type into the input bar of the keyboard, and other apps
get no keys. The shortcut panels hide. Phrases show at the left of the keys,
and the Said list shows at the right. Speak reads the bar aloud and adds it to
the Said list.

Talk mode keeps its own history, the Said list, in the `talk_line` table of
`~/Library/Application Support/September Keyboard/keyboard.sqlite`. No other
part of the keyboard uses this table. The history keeps each line for 30
days, and 1,000 lines at most. The sentence predictions of Talk mode use the
lines of the last hour. Type mode does not use the history. To clear it, open
Settings, then Speech, then click Clear Talk History.

Cut, Copy, and Paste press Command-X, Command-C, and Command-V in the app in
front. In Talk mode they act on the Talk bar: Copy copies its text, Cut also
clears it, and Paste types the clipboard into it. Cut and Copy are off when
the field shows no selection, and in a password field. If the app shows no
field, Cut and Copy stay on. Paste is off when the clipboard holds no text.

History shows the text that you copied, in the place of the sentence
predictions. A page shows six texts. The newest text is at the bottom left,
next to the input bar. A press on a text pastes it into the app in front, or
types it into the Talk bar in Talk mode. Then the predictions show again.

The clipboard history is in the `clip` table of
`~/Library/Application Support/September Keyboard/keyboard.sqlite`, and only
the user can read the file. The history keeps each text for 7 days, and 200
texts at most. A copy of a text that is already in the history moves it to
the newest place. The history keeps no copy from a password manager, no copy
of a file, and no copy from a password field or a field with private text.
The Clipboard page of Settings turns the history off and clears it. When the
history is off, it keeps no texts.

At the first launch after an update, the keyboard moves the lines of
`talk-history.json`, the texts of `clipboard-history.json`, the presses of
`my-panel-usage.json`, and the buttons of `my-panel.json` into the database.
Then it removes the files. If a file does not decode, the keyboard moves it to
`<name>.broken.json`, and the database gets no rows from it.
At launch, the keyboard also removes `usage.json` and `learned.json`. No part
of the keyboard reads these files.

Write opens the Write paper: a sheet with round corners, no window frame,
and a native Markdown editor (`WriteTextView`). The editor hides the Markdown
marks and shows the look of the text. The paper comes out of the input bar
and opens above the keyboard. It is as wide as the largest A4 page above the
keyboard, and as tall as its text. The paper grows up by one line at a time
as the user types. At the top of the page it stops, and the text moves up, so
the typing line stays at the bottom. If Reduce Motion is on, nothing
animates. `WritePaper` holds the rule.

`WriteModel` saves the document 0.12 seconds after the last edit, so Write
has no Save command. A document that the user opens and does not edit is not
saved.
Command-N starts a new document. A `[[` link opens the document with that
title. If a save fails, the error shows at the top of the paper. While the
desk is open, the error shows in the notice of the desk, in place of Undo.
If the desk cannot read the file of a card, the notice shows that error.

The tools rail is a column of round buttons at the left of the paper: New,
Documents, Share, and Close. Its bottom is on the bottom of the paper, so it
stays in place while the paper grows. The rail is a panel that never becomes
the key window, so the caret stays in the editor. Share saves the document
and opens the share picker of macOS with its `.md` file. Close closes the
paper and saves the document. The rail is hidden while the desk is open. The
page keeps the width of the rail free on its left.

A paste keeps the formatting of the copied text. `WritePaste` reads the
pasteboard in this order: HTML, RTF, and then plain text. HTML and RTF become
Markdown, with bold, italic, strikethrough, code, links, headings, and lists.
Plain text is read as Markdown, so a paste of `# Title` gives a heading. If
all of the rich text is monospace, the paste uses the plain text, because a
code editor copies Markdown source as coloured code. Text of one paragraph
takes the block of the paragraph at the caret. One undo removes the whole
paste. Paste as Plain Text (Option-Shift-Command-V) inserts the text with no
conversion.

Command-O, or the Documents key of the Write panel, turns the paper into the
desk. The paper shrinks into its card, and the other documents rise out of
the bar as paper cards, newest first. The first card is always New Document.
The Find field takes the typing, and the input bar shows the query. The left
and the right arrows move between the cards. Return opens the selected card,
and Esc goes back to the paper.

While the desk is open, the Write tab of My Panel shows the Documents keys. Rename opens
the document with its heading selected, because the heading is the file
name. Duplicate makes a copy with the name "Title 2". Move to Trash puts the
file in the Trash of macOS, and Undo shows for 8 seconds. Show in Finder
shows the file in `~/Documents/September`. Each card is a button, and its
spoken label is the title, the date, and the first line.

In Write, Speak reads the selection. If nothing is selected, Speak reads the
whole document without the Markdown marks. `MarkdownSpeech` holds the rule.
If the document has no text, Speak is off.

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

- Key repeat: Delete, Space, an arrow, the volume and brightness keys, and
  the characters that are not letters repeat after the delay of System
  Settings, at its rate. If key repeat is off, no key repeats. One rule
  covers the keys, the panel buttons, and the buttons of My Panel: an arrow,
  Delete, or Space repeats when Command and Control are off. For a panel
  button, only the modifiers of its own shortcut count. Thus a held
  Down button keeps the caret moving, and a held Shift-Down button extends
  the selection. With Command or Control, the key acts once. The modifiers,
  Return, Escape, Tab, and a character with a chord do not repeat. A
  sequence and text act once.
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
  locks it, and a third tap releases it, as Sticky Keys of macOS does. A
  tapped modifier goes down at the OS at once, so a click or a key from the
  hardware keyboard gets it too: Shift-click and Command-click work. A key
  from another source, or a click outside the keyboard, uses up a latched
  modifier. A panel button sends only its own shortcut. A latched, locked, or
  held modifier does not add to it, and the press uses up a latched modifier.
  `KeyboardController.perform(_:)` holds the rule. `OtherInputMonitor` listens for them. Its global monitors get the
  events of other apps. Its local monitors get the keys of Write and Settings,
  but not a click on the keyboard. The monitors need the Accessibility
  permission and not Input Monitoring. In Talk mode the
  OS holds no modifier. Before the app quits, also on SIGTERM and SIGINT, it
  releases the modifiers that it holds. A latched modifier key lights up. A locked modifier key has a stronger fill
  and a bar under its label. Shift shows a filled arrow when it is latched and
  the caps lock arrow when it is locked.

The keyboard also reads the modifiers that macOS holds. `OtherInputMonitor`
gets them from the same monitors, in the device bits of the event flags.
These bits show only the left and right modifier keys of the hardware. The
keyboard posts no device bits, so a modifier that the keyboard holds at the
OS is not in them. fn has no device bit. A modifier that macOS holds lights
its key, and each key of the keyboard carries it. The keyboard posts no down
or up for it until macOS releases it. The shortcut suggestions wait for the
hold delay of a modifier that macOS holds.

The keys show the state of the modifiers. While shift or caps lock is on, the
letters show capitals and the dual keys light up their shifted symbol.

The F-row sends the media keys of an Apple keyboard and shows their icons:
brightness, Mission Control, Spotlight, Dictation, Do Not Disturb, the track
keys, and volume. While fn, Control, Option, Shift, or Command is on, the row
shows F1 to F12 and sends the F-key with the modifiers. Caps lock does not
change the row. The media keys work in Talk mode too.

macOS ignores the Mission Control, Spotlight, Dictation, and Do Not Disturb
keys when an app posts them. Thus these keys take other routes:

- F3 opens `/System/Applications/Mission Control.app`.
- F4 presses the Spotlight shortcut of System Settings, symbolic hot key 64
  of `com.apple.symbolichotkeys`. If the user turned the shortcut off, the
  keyboard beeps.
- F5 presses the Start Dictation item of the Edit menu of the app in front.
  If the app has no such item, the keyboard beeps. The match is on the
  English title.
- F6 runs the Shortcut "Toggle Do Not Disturb". macOS gives an app no other
  way to change Do Not Disturb. To make the Shortcut, add the Set Focus
  action to a new Shortcut. Set the action to toggle Do Not Disturb. If the
  Shortcut is missing, the keyboard beeps.

## Render snapshots

Individual snapshots, for comparing against the design mocks without opening a
window:

```sh
swift run Keyboard --snapshot out.png            # Type mode in Messages, with the panels beside the keys
swift run Keyboard --snapshot out.png --talk     # Talk mode during speech
swift run Keyboard --snapshot out.png --write    # the Write paper in front
swift run Keyboard --snapshot out.png --mine     # My Panel with sample buttons
swift run Keyboard --snapshot out.png --clipboard  # the clipboard history, open
swift run Keyboard --snapshot out.png --mono     # mono variant
swift run Keyboard --snapshot out.png --light    # light appearance
swift run Keyboard --snapshot out.png --gallery  # the component library
swift run Keyboard --snapshot out.png --viewer   # the three tabs of the Debug panel
```

The keyboard snapshots use sample text. They read nothing from your apps.

Two flags change the sample text:

```sh
swift run Keyboard --snapshot out.png --typed "I would"                 # Type mode with this text in the field
swift run Keyboard --snapshot out.png --talk --typed "Can we"           # the Talk bar before Speak
swift run Keyboard --snapshot out.png --talk --spoken 4                 # Speak stops on word 4, counted from 0
swift run Keyboard --snapshot out.png --write --paper story.md         # the Write paper open above the keyboard
```

### Media of the keyboard page

`make landing-media` runs `scripts/landing-media.sh`. The script renders the
screenshots and the animations of the `/keyboard` page of the web app into
`apps/web/public/keyboard`. It renders each frame of an animation as a
snapshot, so it opens no window and reads nothing from your apps. The Write
frames use `--paper`, which places and draws the paper as
`WritePaperController` does, on a screen with 1,000 points above the keyboard. The script
needs ImageMagick and `cwebp` (`brew install imagemagick webp`).

Run it after a change to the look of the keyboard, the panels, Talk, or the
Write paper. Then look at the animations, and commit the files in
`apps/web/public/keyboard`.

## Write Lab

Write Lab runs the Write paper on its own, with the same `WriteController`
as the keyboard. Write Lab shows a stand-in for the keyboard bar at the bottom of
the screen. The bar shows the paragraph at the caret, as the keyboard reads it
for the predictions. Write opens the paper out of the bar, and Documents opens
the desk.

```sh
make lab                                                # the bar and the paper
swift run WriteLab --demo                               # also types a sample document
swift run WriteLab --desk                               # also opens the desk of documents
swift run WriteLab --folder /tmp/notes                  # another folder of documents
swift run WriteLab --snapshot out.png [--dark]          # render the sample document and quit
swift run WriteLab --snapshot out.png --file notes.md   # render a file and quit
swift run WriteLab --debug                              # print the paper frames each second, and draw the paper to /tmp/writelab-<n>.png
```

Write Lab keeps its documents in `~/Library/Application Support/September/Write Lab`.
It never opens the documents of the keyboard in `~/Documents/September`.

The paper is as wide as the largest A4 page above the bar, and as tall as its
text. It grows up by one line at a time as you type. At the top of the page it
stops, and the text moves up, so the line that you type stays at the bottom.
With Reduce Motion on, the paper and the text move with no animation.

The demo calls the editor directly. It posts no key events, so it cannot type
into another app.

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

## The Debug Panel

The Debug panel is a second window at the right edge of the screen. It has the
same height as the keyboard. It has three tabs:

- **Context** shows the last prediction context: the field text with the caret
  and the partial word, the text on screen, and the Said lines. It also shows
  the instructions and the prompt that went to the model, the sentences that
  fit the field, the answers that the engine dropped, the time of the answer,
  and the word completions.
- **Records** shows each table of `keyboard.sqlite` with its count of rows.
  Pick a table to see its first 100 rows. A table with a time column shows the
  newest rows first. This tab changes nothing.
- **Tree** shows the accessibility tree of the app in front. This is the tree
  that Keyboard reads to find the field that it types into.

The tree opens only the branch that leads to the focused element. Each other
element shows as a shut row with a count of its children. The element that gets
the keystrokes is the deepest row on screen. The tree reads again when the
focus moves, when the app in front changes, every 2 seconds, and when you push
the refresh button.

For a password field or private text, the Context tab shows no text of the
field, and the Tree tab shows no value on the focused element.

To show or hide the panel, use **Debug Panel** in the menu bar item. The
keyboard centres in the space that is left, so the two windows do not overlap.

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

## Shortcut suggestions

In Type mode, the shortcuts of the app in front take the place of the input
bar in two cases:

- No text field has focus.
- Command or Control is on. This is a modifier key of the keyboard that is
  latched or locked, or a modifier key of the hardware keyboard that you hold
  for 0.4 seconds. Only the shortcuts that hold all the modifiers that are on
  show. The sentence predictions of a text field stay above the shortcuts.

The shortcuts are panel buttons in one row, 12 at most. A button shows only
its keys. Its name shows above it on hover, and its accessibility label holds
the name and the keys. A press presses the keys in the app and ends a latched
modifier. The shortcuts are the menu items of the app with a chord. The
shortcuts that you press most in this app come first, and the others keep
the menu bar order. The keyboard reads the menu bar through accessibility
when a suggestion needs it, and keeps the read until another app comes to
the front. The order is set at the read, so a shortcut does not move while
the app stays in front.
The suggestions leave out the Apple menu, which holds Log Out and Lock Screen,
and the menu items that are off. The app menu, with Hide and Quit, comes last.
Talk mode and the Write window show no shortcut suggestions.

## Stored data

The Keychain holds the secrets:

- The ElevenLabs key is in the service `com.september.keyboard`, account
  `elevenlabs`.
- If the September desktop app has a key in `com.september.desktop`, Settings
  can copy it. macOS asks one time before the keyboard reads it.
- The text of each private text button is in the service
  `com.september.keyboard.private`. If the Keychain has no text for a
  button, or cannot read it, a press on the button types nothing and beeps.
  The latched modifiers stay for the next key.

Write keeps each document as a Markdown file in
`~/Documents/September`. The sentence history, the Talk history, the clipboard
history, and the buttons of My Panel and their presses are in
`keyboard.sqlite` in `~/Library/Application Support/September Keyboard`. Only
the user can read this file.

## Tests

Tests are a plain executable with a ~40-line harness in
`Tests/KitTests/Harness.swift`. Run them with `make test`, which runs
`swift run KitTests`. Xcode is installed now, so swift-testing is available.
To move to it, change the target to `.testTarget` and replace
`test`/`expect` with `@Test`/`#expect`. Then change the `test` target of the
Makefile to `swift test`. The test bodies change very little.

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
