# Changelog

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
