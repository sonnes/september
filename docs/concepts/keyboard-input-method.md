---
title: The input method (macOS)
description: The keyboard app is also a palette input method, as the Apple Accessibility Keyboard is. It reads the focused field and puts a picked word in with one edit.
package: keyboard
---

# The input method (macOS)

The September keyboard is a palette input method of InputMethodKit, as the
Apple Accessibility Keyboard is. One process holds the keys, the windows, and
the input method. The code is in `apps/keyboard/Sources/Keyboard/InputMethod.swift`.
The rules that do not need a running app are in
`apps/keyboard/Sources/SeptemberKit/Input/InputClient.swift`, with checks in
`apps/keyboard/Tests/KitTests/InputClientTests.swift`.

## Install

An input method runs only from `~/Library/Input Methods`.

1. The app starts from another folder, such as `/Applications`.
2. `InputMethod.relocateIfNeeded()` copies the bundle to
   `~/Library/Input Methods` if the executable there is different. It stops the
   running copies first.
3. It registers the copy with `TISRegisterInputSource`, opens the copy, and
   quits.
4. The copy starts `IMKServer` with the `InputMethodConnectionName` of
   `Info.plist`.
5. `InputMethod.selectSelf()` selects the input source when the user has
   allowed it. It never asks at launch.

The user allows the input method with **Turn On…** in Settings, Typing. On
macOS 27, `TISEnableInputSource` does not enable a third-party input method.
It opens System Settings, and the user must confirm one time. After the
confirmation, the keyboard selects the source at each start.

The copy keeps the signature of the bundle. Thus the Accessibility permission
stays after the move and after an update with the same signing identity.

`make run` and `make dev` run the bare binary. The bare binary is no input
method, and the keyboard reads the field only through accessibility.

## Read the field

macOS calls `activateServer` of `InputController` for each focused field, and
`deactivateServer` when the field loses the focus. `InputClients` keeps the
client of the focused field. A palette gets no `inputText` for typed keys. Thus
the keyboard reads the client after its own keys, through `FocusWatcher`.

`FieldSnapshotReader` reads the client with the rules of the Apple keyboard:

- If the client gives a length, the reader reads the whole field.
- If the client gives a length of 0, the reader reads 100 characters before
  and after the caret.
- A client with no caret, or with the length `Int32.max`, gives no snapshot.
  System Settings and some web views give these values.
- A client that gives NUL characters gives no snapshot. The password dialog
  of macOS gives NUL characters.

A password field never uses the input client. `FocusWatcher` checks the
subrole of the field through accessibility first.

## Insert a picked word

`KeyboardSession.pickWord` asks its `TextInserting` port to replace the typed
word with the picked word and a space. `InputClientInserter` does this with
one `insertText(_:replacementRange:)` call. It refuses when the field does not
hold the typed word before the caret. Then the keyboard uses keys: Delete for
each typed character, then the text.

After an insert in Messages, Mail, Safari, Notes, Spotlight, Calendar, or Maps,
the keyboard taps Control. The Apple keyboard does the same, to close the
inline prediction of macOS.
