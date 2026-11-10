# Changelog

## 0.3.1

### Shortcut Suggestions

- The shortcuts of the app in front show in the place of the input bar. In 0.3.0, the place of the bar stayed empty, because the keyboard did not read the menu bar of the app.

### Panels

- The name of a panel button shows above the button. In 0.3.0, the name covered the top half of the button.

## 0.3.0

### Predictions

- The sentence predictions show only after you type in a field. The word row does not wait.
- The sentence history keeps the sentences that you send with Return on the keys, or with Speak in Talk mode. While you type, up to two sentences from the history that start with your text show above the predictions of Apple Intelligence.
- History rows also show when Apple Intelligence is not available.
- The history ranks a sentence by its uses, and it keeps 10,000 sentences at most. It keeps nothing from a password field, from private text, or from the Write window. The Predictions page of Settings turns the history off and clears it.

### Shortcut Suggestions

- In Type mode, when no text field has focus, the shortcuts of the app in front show in the place of the input bar. The shortcuts come from the menu bar of the app. A press presses the shortcut in the app.
- When Command or Control is on, only the shortcuts with that modifier show. A latched modifier ends after the press.
- If you hold Command or Control on the hardware keyboard for 0.4 seconds, the shortcuts also show. This needs Input Monitoring. The Predictions page of Settings asks for it.
- Each button shows only its keys. The name of the shortcut shows on hover.
- This version removes the app panel, because the shortcut suggestions replace it. The window is now My Panel. It shows your own buttons, and a Write tab while Write is in front.

### Storage

- The sentence history, the Said list, the clipboard history, and the buttons of My Panel are in one database: `~/Library/Application Support/September Keyboard/keyboard.sqlite`.
- At the first launch after the update, the keyboard moves the Said list, the clipboard history, and My Panel from the old JSON files into the database. Then it removes the files. A file that does not decode moves to `<name>.broken.json`.
- If `my-panel.json` does not decode, it stays in place, and My Panel shows an error. Your buttons are not lost.
- Only you can read the database file and its `-wal` and `-shm` files.
- The keyboard removes `usage.json` and `learned.json`. The old app panel wrote these files.

## 0.2.0

### Clipboard

- Cut, Copy, and Paste sit at the left of the input bar. In Talk mode, they act on the Talk bar.
- History shows the texts that you copied, in the place of the sentence predictions. A press pastes a text into the app in front.
- The history keeps each text for 7 days, and 200 texts at most. It keeps nothing from a password field, a field with private text, or a password manager. The Clipboard page of Settings turns the history off and clears it.

### Write

- Write opens a sheet of paper above the keyboard. The editor hides the Markdown marks and shows headings, lists, to-do items, and bold text.
- The paper grows up one line at a time as you type, as paper comes out of a typewriter. If Reduce Motion is on, nothing moves.
- Each document saves itself in `~/Documents/September` as you type. Command-N starts a new document, and a `[[` link opens the document with that title.
- Command-O opens the desk, where your documents stand as paper cards. Find a document, or rename, duplicate, or move a document to the Trash. Undo shows for 8 seconds after you move a document to the Trash.

### Panels

- If Rectangle is installed, the Rectangle keypad moves the window in front to a half, a third, two thirds, or a corner of the screen. Each button shows the part of the screen that the window fills.
- The Edit keypad is now part of the System keypad.

## 0.1.0

The first public release of September Keyboard. It is a floating keyboard for people with ALS, MND, or other speech and motor difficulties. It types into the app in front, and it can speak for you.

### Typing

- The keys type into any app. They work with a mouse, a trackpad, a head pointer, Dwell, Switch Control, and Voice Control.
- A held key obeys the key repeat and Slow Keys settings of macOS. Hold a letter to get its accents.
- The input bar shows the text of the field that you type into. It shows nothing for a password field.

### Predictions

- A row of words above the keys completes the current word, or gives the next word. The words come from macOS, and macOS learns from the words that you pick.
- Three sentence predictions continue what you typed. They use Apple Intelligence, on macOS 26 or later with Apple Intelligence on.
- If you allow it in Settings, the sentence predictions also use the text near the field, such as the last messages of a chat. This setting is off by default.

### Shortcut panels

- The Edit, Text, and System keypads float beside the keys. The Text keypad has arrow keys in the layout of a Mac keyboard.
- The app panel shows shortcuts for the app in front. It learns the shortcuts that you use and puts them first.
- My Panel holds your own buttons. You can import the panels of the macOS Accessibility Keyboard.
- Drag a panel by its grip to move it. Arrange puts the panels back beside the keys.

### Talk and Write

- Talk mode is for a conversation. The keys type into the input bar, and Speak reads it aloud with a macOS voice, your Personal Voice, or an ElevenLabs voice.
- The Said list keeps what you said for 30 days. You can clear it in Settings.
- The Write window is a Markdown editor for longer text. It saves each document in `~/Documents/September`, and Speak reads the document aloud.

### Requirements

- macOS 14 or later. Sentence predictions need macOS 26 or later.
- Accessibility access, so that the keys can type into other apps. The app shows a banner until you allow it.
- Input Monitoring is optional. With it, the app panel also learns the shortcuts that you press on a hardware keyboard.
