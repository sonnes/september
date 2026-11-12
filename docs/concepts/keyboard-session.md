---
title: Keyboard session (macOS)
description: KeyboardSession joins the parts of the Mac keyboard. The views and the app shell call it, and it tells each part what changed.
package: keyboard
---

# Keyboard session (macOS)

`KeyboardSession` joins the parts of the keyboard. The views and the app shell
(`AppDelegate`) call the session. The session tells each part what changed.

The session is in `apps/keyboard/Sources/SeptemberKit/Integration/KeyboardSession.swift`.
It runs on the main actor. The checks are in
`apps/keyboard/Tests/KitTests/IntegrationTests.swift`.

## The parts

| Part | Type | What the session does with it |
|---|---|---|
| The keys and the field | `KeyboardController` | Reads the input, the mode, and the private state. Types the text of a prediction. |
| The predictions | `PredictionEngine` | Feeds it with the field, or with the Talk bar and the Said list. |
| The voice | `Speaker` | Speaks the text of Speak, and stops it. Gives Talk mode its voice. |
| The Write panel | `PanelStore` | Takes the paper keys or the desk keys while Write is in front. |
| My Panel | `UserPanelStore`, `UsageStore` | Counts the presses and ranks the buttons of Mine. |
| The input bar | `InputBarVisibility` | Shows the bar and the suggestions only when there is text input. |
| The clipboard | `ClipboardHistory`, `ClipboardAccess` | Pastes a copied text, and does Cut, Copy, and Paste in each mode. |

The app sets two hooks:

- `readMenu` reads the menu shortcuts of the app in front. See
  [Shortcut Suggestions](#shortcut-suggestions).
- `writeSpeech` reads the selection and the document of the Write paper, or
  the Find query of the desk. The keyboard cannot read its own window through
  the accessibility API.

The views read these values of the session:

- `speakMode`: Speak, Stop, or off.
- `spokenWord`: the word that the voice speaks now, as a range in the text of
  the bar. It is `nil` when the bar does not hold the spoken text.
- `writePanel`: the keys of the Write paper or the Write desk while Write is
  in front. It is `nil` for another app.
- `panelTab`: the Write tab or the Mine tab of My Panel. Without Write in
  front, My Panel shows only Mine.
- `mineButtons`: the buttons of Mine, most used first.
- `userPanelError`: the reason that My Panel could not read its file.
- `isHistoryOpen`: true while the clipboard history shows in the place of the
  predictions.
- `historyPage`: the page of the history. Page 0 holds the newest texts.
- `canCutOrCopy`: true for a selection in the field, for an app that shows no
  field, and for text in the Talk bar. False for a password field.
- `canPaste`: true when the clipboard holds text.

## Start

`init` does these steps in this order:

1. It gives the voice to Talk mode (`controller.talk.speech`).
2. It sends each chord of the keys to `chordPressed(_:)`.
3. It ranks My Panel.
4. It starts to observe the parts.
5. It reads the clipboard for `canPaste`.
6. It does the first update.

## The update

The session observes `objectWillChange` of the controller, Talk mode, the Said
list, and the voice. `objectWillChange` fires before the publisher stores the
new value, so the update waits one turn. One update runs for all the changes of
that turn.

An update does these steps in this order:

1. It feeds the predictions. In Type mode, the input is the field, with the
   text on screen when its switch is on, and no Talk history. In Talk mode,
   the input is the Talk bar, and the lines of the last hour of the Talk
   history are the conversation. Private text gives the predictions no input.
   The engine shows sentence predictions only after the user types in the
   field. `focusMoved()` and `appChanged(...)` start a new field.
2. If the speech ended after the last update, it tells Talk mode. Talk mode
   then empties the bar.
3. It sets `speakMode`. In Type mode, Speak is on when the field has text to
   read. On the Write paper, Speak is on when the document has text.
4. It sets `spokenWord`.
5. It sets `canCutOrCopy`.
6. It sets `shortcuts`. See [Shortcut Suggestions](#shortcut-suggestions).

The input bar does not wait for the turn. The session takes the focused field,
the input, the mode, the private state, and the Write paper from their
publishers. Then it tells `InputBarVisibility` if the bar must show.

My Panel ranks Mine again only when an app comes to the front, so a button
never moves while the user aims at it. A change in the My Panel page of
Settings ranks Mine at once, because the user is in the Settings window.

## Calls from the app shell

### An app comes to the front

`FocusWatcher` follows the app in front. For a new app, the calls come in this
order:

1. `FrontAppTracker` decides between the Write paper and another app.
2. `appChanged(name:bundleID:)`. The controller clears the text of the last
   app. Then `writePanel` changes, and Mine takes its new order.
3. `focusMoved()`. The private state of the last field ends.
4. `controller.focusChanged(to:)` with the field of the new app.

If the field of the new app comes before `appChanged`, the controller clears
it, and the bar stays empty. For this reason, `FocusWatcher.onAppChanged` is
the only observer of the app switch.

### The focus moves in the same app

1. `focusMoved()`, only for a different element. New text in the same element
   is not a focus move, so private text stays hidden until the focus leaves its
   field.
2. `controller.focusChanged(to:)` with the new field.

### The Write paper

The Write paper is in the keyboard process, and the keyboard cannot read its
own window through the accessibility API. When the paper becomes the key
window, the app calls `appChanged` with `WritePanel.id`. Then the editor
reports the paragraph at the caret after each edit and each caret move. The
app gives it to `writeCaretRead(_:)`. The session sends the paragraph to
`controller.focusChanged(to:)` and records if the document has text.

The desk of Write is the other window of Write. When the paper turns into the
desk, the app calls `appChanged` with `WritePanel.documentsID`, so the Write
tab shows the Documents keys. The desk reports its Find query in place of
the paragraph. When the desk turns back into the paper, the app calls
`appChanged` with `WritePanel.id` again.

### The clipboard changes

macOS has no notification for a change of the clipboard. The app makes a
`ClipboardWatcher`, and a timer calls `poll()` every 0.5 seconds. A poll with
no change compares one number. For each change, the watcher adds the text to
`ClipboardHistory` and calls `pasteboardChanged()`. The watcher keeps no copy
in these conditions:

- The copy has a type of `ClipboardWatcher.skippedTypes`. Password managers
  set these types (nspasteboard.org).
- The copy is a file, or it has no plain text.
- The focused field is a password field or holds private text.

The text on the clipboard at launch does not go into the history.

## Calls from the views

| Call | From | What happens |
|---|---|---|
| `type(_:)` | A prediction tile | Types into the app in Type mode, or into the Talk bar in Talk mode. |
| `screenRead(_:)` | `AppDelegate`, after a read of the text near the field | Keeps the text for the sentence predictions of Type mode. A read of an app that is no longer in front is dropped. A new app clears the text. |
| `pickWord(_:)` | A word completion | Types the rest of the word as `type(_:)` does. The engine keeps the word until the user submits the text. |
| `speakPressed()` | Speak | See [Speak](#speak). |
| `pressMine(_:)` | A button of Mine | Counts the press for the order of Mine, then does the action. |
| `pressShortcut(_:)` | A shortcut suggestion | Presses the chord of the suggestion in the app. A latched modifier ends. |
| `hardwareModifiersChanged(_:)` | `ModifierTap` | See [Shortcut Suggestions](#shortcut-suggestions). The modifiers that the keyboard holds at the OS are not hardware modifiers, so the session removes them first. |
| `toggleHistory()` | History | Shows the clipboard history in the place of the predictions, on its newest page, or shows the predictions again. An app change and a mode change close the history. |
| `olderPage()`, `newerPage()` | Older and Newer | Turns the pages of the history. |
| `pasteClip(_:)` | A copied text | See [The Clipboard](#the-clipboard). |
| `cut()`, `copy()`, `paste()` | Cut, Copy, and Paste | See [The Clipboard](#the-clipboard). |

## Picked Words

The word row shows the candidates of macOS (`CandidateCompleter`). The engine
keeps each word that the user picks. The user submits the text with Return in
Type mode or with Speak in Talk mode. Then the engine tells macOS about each
picked word:

- If the text still holds the word, the response is accepted.
- If the user changed the word, the response is edited.

A new field and a new app clear the picked words, and nothing is recorded.
Private text and a password field record nothing.

## Sentence History

The same submit also adds the sentences of the paragraph at the caret to the
`SentenceHistory`. With the Write window in front, the session calls
`submit(keepsSentences: false)`, because Write keeps its text in its
documents. While the user types, the engine adds the history sentences that
continue the sentence at the caret to the rows of the stack. See
[keyboard-storage.md](keyboard-storage.md).

## Shortcut Suggestions

In Type mode, `shortcuts` holds the shortcuts of the app in front when no
text field has focus, or when Command or Control is on. The view shows them
in the place of the input bar. Otherwise `shortcuts` is empty, and the bar
shows. Talk mode and the Write window have no shortcuts.

- The shortcuts come from `AppShortcut.suggestions(menu:modifiers:)`: the
  menu items of the app with a chord, in menu bar order. Each chord shows one
  time.
- `readMenu` reads the menu shortcuts of the app in front. The app shell sets
  it in each app change. The session calls it only when it needs shortcuts,
  and keeps the result until the next app change.
- The modifiers that are on are the modifiers of the keys, latched or locked,
  and the modifiers that the user holds on the hardware keyboard. With
  Command or Control on, only the chords that hold all these modifiers stay.
- `hardwareModifiersChanged(_:)` waits `modifierHoldDelay` (0.4 seconds)
  before a held Command or Control counts, so a quick chord does not change
  the stack. A release, or a change while the shortcuts show, counts at once.

## Speak

`speakPressed()` does one of these:

- During speech, it stops the voice. In Talk mode, the text stays in the bar.
- In Talk mode, it speaks the bar, and the text goes to the Said list.
- In Type mode with the Write paper in front, it reads `writeSpeech`. It
  speaks the selection, or the whole document without its Markdown marks
  (`MarkdownSpeech`).
- In Type mode in another app, it speaks the selection of the field, or the
  whole field (`SpeakText`). A password field and private text have nothing to
  read.

## The Clipboard

In Type mode, the clipboard actions go to the app in front:

- Cut, Copy, and Paste press Command-X, Command-C, and Command-V.
- `pasteClip(_:)` puts the text on the clipboard and moves it to the newest
  place of the history. Then it presses Command-V.

In Talk mode, the clipboard actions act on the Talk bar, and the app in front
gets no events:

- Copy puts the text of the bar on the clipboard. Cut also clears the bar.
- Paste types the text of the clipboard into the bar.
- `pasteClip(_:)` types the copied text into the bar.

A press on a copied text closes the history.

## Checks

`settle()` waits until the parts take the last change: the read of the Write
window, the pending update, and the request of the predictions. A check calls
`settle()` before it reads a result.
