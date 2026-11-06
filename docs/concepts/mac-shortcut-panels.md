---
title: Shortcut panels (macOS)
description: Panels are grids of buttons in JSON. A button types text or presses a key combination. Each app can have its own panel, and a generic panel is the fallback.
package: keyboard
---

# Shortcut panels (macOS)

Panels are on each side of the macOS keyboard. EDIT is on the left. NAVIGATE
and SYSTEM are on the right. The shortcuts of the app in front are also a
panel. Each panel is a grid of buttons in a JSON file that the app loads at
launch.

The Apple Accessibility Keyboard uses the same model: `.ascconfig` bundles of
buttons with actions. September has no absolute layout and no modal editor.

## The model

```
PanelDefinition   title, columns, buttons
  PanelButton     id, label, symbol (SF Symbol), action
    PanelAction   .shortcut(Shortcut) | .text(String)
```

A button presses a key combination or types a phrase. A text button uses up
the latched modifiers, the same as a text key.

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

`PanelStore.bundled()` loads them. The file name is the name of the panel. To
add shortcuts for an app, add `Apps/<bundle id>.json`. No Swift change is
necessary.

`PanelStore.bundled()` throws if a panel is missing, if a file does not
decode, or if two buttons in a panel have the same id. The app then shows the
error and quits.

## Following the frontmost app

`FocusWatcher` reports each change of the frontmost app. Then
`KeyboardController.appChanged(name:bundleID:)` shows the panel for the bundle
ID of that app, or `generic.json` if no panel has that name. The keyboard
window does not activate, so the frontmost app is always the app that gets
the keys.

## Adding a panel

1. Write the JSON:

   ```json
   {
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
(`"return"`, `"pageDown"`, `"f5"`). An unknown modifier, key, or action type
stops the decoding with an error.
