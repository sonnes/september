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
make app        # build + sign September Keyboard.app (needs its own permission grant)
make dmg        # package the app with an Applications shortcut
make release    # Developer ID, notarize, staple, Gatekeeper check (reads ../../.envrc)
make publish    # GitHub Release of the DMG — ask the user first
make icon       # Resources/AppIcon.svg → AppIcon.icns (needs rsvg-convert)
make open       # build, sign, launch
make lab        # Write Lab: the Write paper on its own
make snapshots  # keyboard (Type, Talk, Write, Mine, Clipboard) + component library PNGs in .build/snapshots
```

Run them from `apps/keyboard/`, or `make mac-test` / `mac-run` / `mac-dev` /
`mac-app` / `keyboard-dmg` / `keyboard-release` / `mac-stop` from the repo root.

## Layout

| Path | Holds |
|---|---|
| `Sources/SeptemberKit/Accessibility` | `AXNode`/`AXTree` (another app's tree, snapshotted), `AccessibilityPermission` |
| `Sources/SeptemberKit/Clipboard` | `ClipboardHistory` (the copied texts), `ClipboardAccess` (the clipboard), and `ClipboardWatcher` (adds each copy) |
| `Sources/SeptemberKit/Design` | tokens, metrics, typography, rainbow/mono styles |
| `Sources/SeptemberKit/Keyboard` | key definitions, QWERTY layout, `KeyboardController` |
| `Sources/SeptemberKit/Input` | modifiers, keystrokes, layout-aware key code map, the key settings of macOS (`KeyTiming`) and the timing of a held key (`KeyPresser`) |
| `Sources/SeptemberKit/Integration` | `KeyboardSession` (joins the parts), `SpeakText`, `FrontAppTracker`, `PanelPlacement`, `KeyboardPosition`, `InputBarVisibility` |
| `Sources/SeptemberKit/Panels` | panel model, JSON loading, the grid of the Write panels, the shortcut suggestions |
| `Sources/SeptemberKit/Predictions` | sentence predictions (Apple Intelligence) and word completions |
| `Sources/SeptemberKit/ScreenContext` | `ScreenContext`, the rule of each app (`ContextRule`), and `ScreenContextExtractor` |
| `Sources/SeptemberKit/Speech` | `Speaker`, the macOS voices, ElevenLabs, the Keychain store |
| `Sources/SeptemberKit/Storage` | `KeyboardDatabase` (`keyboard.sqlite` and its migrations) and `SentenceHistory` (the sentences that the user sent) |
| `Sources/SeptemberKit/Talk` | Talk mode, the Said list, the Phrases panel |
| `Sources/SeptemberKit/UserPanel` | My Panel, private text, the Accessibility Keyboard import |
| `Sources/SeptemberKit/Settings` | the Settings pages and `KeyboardSettings` |
| `Sources/SeptemberKit/Write` | the document library, `WriteModel` (the open document and its saves), `WriteController` (joins the documents, the paper, and the desk), `WriteDesk` (the cards, the Find query, and the selected card), `EditorCaret` and `EditorSpeech`, and `MarkdownSpeech` (the text that Speak reads) |
| `Sources/SeptemberKit/WriteEditor` | the native Markdown editor (`WriteTextView`), the Markdown blocks (`WriteMarkdown`), the Write paper with round corners (`WritePaperController`, `WritePaper`), and the desk of document cards (`WriteDeskController`, `WriteDeskLayout`, `WriteCardView`) |
| `Sources/SeptemberKit/Views` | keys, shortcut buttons, panels, the keyboard screen, and the views of each part |
| `Sources/SeptemberKit/Resources/Panels` | `text`/`system`/`rectangle`/`phrases`/`write`/`write-documents.json` |
| `Sources/SeptemberKit/Resources/Accents` | the accents of a held letter, by language (`en.json`) |
| `Sources/SeptemberKit/Resources/Context` | the rule of each app for the text on screen (`<bundle id>.json`) |
| `Sources/Keyboard` | app shell, `FloatingPanel`, `CGEventSink`, `FocusWatcher`, `OtherInputMonitor`, `SystemPasteboard`, `MenuBarReader`, `AXTreeReader`, the Settings window, snapshots |
| `Sources/WriteLab` | Write Lab: the Write paper on its own, with a stand-in for the keyboard bar (`make lab`) |
| `Tests/KitTests` | tests + the harness |

Rule of thumb: **anything testable lives in `SeptemberKit`**. `Keyboard` holds
only what needs a running app — the panel, the event sink, the menu bar.

## Rules

- **Anything testable lives in `SeptemberKit`.** `Keyboard` holds only what
  needs a running app: the panel, the event sink, and the menu bar.
- **TDD, strictly.** Write the failing test first, then the smallest code that
  passes it. Every model change lands with a test in `Tests/KitTests`.
- **Tests are an executable, not `swift test`.** `make test` runs
  `swift run KitTests`. Add checks with
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
  tap. The `pressable` view modifier does all of this. A container that holds
  a button uses `.accessibilityElement(children: .contain)`, not `.combine`,
  so that the button stays its own element. Dwell, Switch Control
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
  Write paper, the desk of Write, and the Settings window take focus. To
  open one of them, call
  `AppActivation.bringToFront(_:)`, and call `AppActivation.windowClosed(_:)`
  when it closes.
- **A floating window has no title bar.** `FloatingPanel` is borderless. A
  title bar gives the hosting view a safe area, and then the content jumps up
  and down as it changes.
- **Wire the parts through `KeyboardSession`.** The session feeds the
  predictions from the input bar, empties the Talk bar when the speech ends,
  and counts the presses of My Panel to rank its buttons. Put new wiring there,
  with a check in `Tests/KitTests/IntegrationTests.swift`. `AppDelegate` keeps
  only what needs a running app. See `docs/concepts/keyboard-session.md`.
- **Private text stays private.** Never log or print the text of a field, a
  private text button, or an API key. Keep the text of a field only in the
  sentence history. While `isFieldPrivate` is true,
  the predictions, Speak, learning, and the tree viewer get no text of the
  field. Call `KeyboardSession.focusMoved()` only when the focused element
  changes, not when its value changes.
- **An app switch is one ordered step.** `FocusWatcher.onAppChanged` clears the
  last app's text through `KeyboardSession.appChanged` *before* the new app's
  field is read. Do not observe `didActivateApplication` anywhere else: two
  observers of one notification cannot promise that order, and the bar ends up
  stuck empty. The Write paper belongs to the keyboard process, so
  `FrontAppTracker` decides between the Write paper and another app. It
  matches apps on the process ID.
- **The input bar is a mirror, not a buffer.** It shows the focused field's own
  text (`InputMirror.mirrored`), our echo only when the app exposes none, and
  nothing for a password field. Never keep text typed into an
  `AXSecureTextField`. See `docs/concepts/input-mirroring.md`.
- **Panels are data.** New shortcuts are JSON in `Resources/Panels`, not Swift.
  A button presses a `shortcut`, presses a `sequence` of shortcuts, types
  `text`, or does a `scroll`. The file name is the panel's identity. `PanelStore` throws on a
  missing or broken file, and the app shows the error and quits.
- **Context rules are data.** The rule that reads the text near the field in
  an app is `Resources/Context/<bundle id>.json`, not Swift. Add one app at a
  time, and check it with `--ax --context-shape`. An app with no file gets the
  general rule of `ScreenContextExtractor`.
- **The text on screen is private.** Read it only while
  `PredictionEngine.screenEnabled` is true, only in Type mode, and never for a
  password field or private text. Never log or print it. The probe prints
  shapes only.
- **The clipboard history is private.** Never log or print a copied text.
  `ClipboardWatcher` keeps no copy that a password manager marks, no copy of a
  file, and no copy while the focused field is a password field or holds
  private text. Only `ClipboardWatcher.poll()` reads the clipboard for the
  history.
- **The sentence history is private.** Never log or print a sentence. Only
  `PredictionEngine.submit(keepsSentences:)` adds sentences. It adds nothing
  from a password field, from private text, or from the Write window.
- **The database has one schema path.** Change the tables of
  `keyboard.sqlite` only with a new step at the end of
  `KeyboardDatabase.migrations`. Never edit an old step. See
  `docs/concepts/keyboard-storage.md`.
- **A suggestion never comes from the Apple menu.** `AppShortcut.menu(_:)`
  leaves out the Apple menu, because one press there logs out or locks the
  Mac. Keep it out of every list of suggestions.
- **Keep Swift 6 concurrency clean.** UI, controller and keystroke sinks are
  `@MainActor`. A type that holds an accessibility element and crosses actors
  is `@unchecked Sendable`, with a comment that says why. Do not silence
  warnings any other way.

## Gotchas

- Accessibility permission is bound to *(bundle id, code signature)*. Ad-hoc
  signing revokes it on every rebuild — create the `Keyboard Dev` certificate
  (README) before wondering why keys stopped working.
- The app is September Keyboard, bundle ID `app.september.keyboard`. The
  Keychain services stay `com.september.keyboard` and
  `com.september.keyboard.private`: they are storage names, and a new name
  loses the saved key and the private text.
- Never prompt for permission at launch. The banner and the menu item ask for
  Accessibility.
- Key code mapping goes through `UCKeyTranslate`, never a hardcoded US table,
  and rebuilds when the input source changes. A shortcut letter that the
  current layout lacks comes from the ASCII-capable layout, as macOS does.
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
- A floating window moves only by its grip. The grip moves the window from its
  own mouse events, so a window that never becomes key moves too.
  `isMovableByWindowBackground` is off, so a press on a key never moves the
  window.
- `ImageRenderer` puts a grey layer over the whole view when the view holds
  an app icon from `NSWorkspace`. Draw the icon into a small bitmap first
  with `tabIcon()`.
- Keyboard is an accessory app. Activation is cooperative since macOS 14,
  and macOS refuses `NSApp.activate()` after a press through `AXPress`. Then
  `WindowActivation` shows the window on top with `orderFrontRegardless()`,
  and the window takes the focus when the app becomes active. Do not use
  `activate(ignoringOtherApps:)`.
- A latched or locked modifier is down at the OS. If the process dies by
  SIGKILL or a crash, the modifier stays down. To clear it, press and release
  that key on the hardware keyboard.
- `make run` and `make dev` show the keyboard on the screen of the user. Stop
  it with `make stop` when the check is done.
- Do not test with the pointer of the user. To read the keyboard or press
  through `AXPress`, use headless agent-desktop.
- The keyboard window, the tree viewer, and the default places of the shortcut
  panels share the bottom margin of the screen. The keys and the panels
  centre in the space left after `reservedWidth`. `PanelPlacement` puts the
  panels beside the keys, with their tops in line with the top of the keys.
  Arrange calls `PanelPlacement.arrangedFrames` with the current place of the
  keys, so the panels follow a keyboard that the user moved.
