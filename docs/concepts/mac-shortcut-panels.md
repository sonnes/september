---
title: Shortcut panels (macOS)
description: Panels are data, not views — grids of buttons that type text, press a key combination, or open another panel, with one panel per app and a generic fallback.
package: keyboard
---

# Shortcut panels (macOS)

The macOS keyboard is surrounded by panels: EDIT on the left, NAVIGATE and
SYSTEM on the right, and the shortcuts for whichever app is in front. All of
them are the same thing — a grid of buttons defined in JSON, loaded at launch.

This mirrors how Apple's own Accessibility Keyboard works (`.ascconfig` bundles
of buttons with actions, see
[the research notes](../research/2026-07-27-macos-accessibility-keyboard.md)),
minus the absolute-rect layout and the modal editor.

## The model

```
PanelDefinition   id, title, columns, buttons
  PanelButton     id, label, symbol (SF Symbol), action
    PanelAction   .shortcut(Shortcut) | .text(String) | .openPanel(String)
```

Three actions, deliberately: press a key combination, type a phrase, or move to
another panel. Anything a communication panel needs, and nothing that requires
code to express.

`Shortcut` renders its own hint (`⇧⌘Z`) and its own spoken name ("Shift Command
Z"), so a button never has to repeat itself in JSON.

## Where they live

```
Sources/SeptemberKit/Resources/Panels/
├── edit.json                        # left keypad
├── navigate.json                    # right keypad, top
├── system.json                      # right keypad, bottom
└── Apps/
    ├── generic.json                 # fallback for unknown apps
    └── com.microsoft.VSCode.json    # one file per known app, named by bundle id
```

`PanelStore.bundled()` loads them. Panels in `Apps/` are keyed by file name, so
adding shortcuts for an app means adding `Apps/<bundle id>.json` — no Swift.

## Following the frontmost app

`KeyboardController` observes `NSWorkspace.didActivateApplicationNotification`
and swaps `appPanel` for the panel matching the new frontmost app's bundle ID,
falling back to `generic.json`. Because the keyboard panel is non-activating, it
never becomes frontmost itself, so this always reflects the app the user is
actually typing into.

## Adding a panel

1. Write the JSON:

   ```json
   {
     "id": "app.com.apple.Safari",
     "title": "SAFARI",
     "columns": 2,
     "buttons": [
       { "id": "new-tab", "label": "New Tab", "symbol": "plus.square",
         "action": { "type": "shortcut", "modifiers": ["command"], "key": "t" } }
     ]
   }
   ```

2. Save it as `Resources/Panels/Apps/com.apple.Safari.json`.
3. Add a check in `Tests/KitTests/PanelTests.swift` if the panel carries
   behaviour worth pinning.

Key names are a single character (`"t"`) or a `VirtualKey` case name
(`"return"`, `"pageDown"`, `"f5"`). Unknown modifiers, keys or action types fail
decoding loudly rather than silently dropping a button.
