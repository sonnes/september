---
title: Shortcut panels (macOS)
description: Panels are grids of buttons in JSON. A button types text or presses a key combination. Each app can have its own panel, and a generic panel is the fallback.
package: keyboard
---

# Shortcut panels (macOS)

Panels are on each side of the macOS keyboard. SYSTEM and the app panel are on
the left. TEXT and RECTANGLE are on the right. RECTANGLE shows only when the
Rectangle window manager is installed (`DetachedPanel.shown(rectangleInstalled:)`). Cut, Copy, and Paste are buttons at the left
of the input bar, so no keypad has them. The shortcuts of the app in front are
also a panel. Each panel is a grid of buttons in a JSON file that the app loads at
launch.

The Apple Accessibility Keyboard uses the same model: `.ascconfig` bundles of
buttons with actions. September has no absolute layout and no modal editor.

## The model

```
PanelDefinition   title, columns, buttons, arrows
  PanelButton     id, label, symbol (SF Symbol), action
    PanelAction   .shortcut(Shortcut) | .text(String)
  PanelBlock      columns, buttons
```

`arrows` is an optional `PanelBlock` below the grid, with columns of its own.
The Text keypad uses it for an inverted T of arrow keys, in three columns. A
keypad with three columns, in its grid or in its arrows, is three buttons
wide. System has three columns.

A button presses a key combination or types a phrase. A text button uses up
the latched modifiers, the same as a text key.

`Shortcut` renders its own hint (`⇧⌘Z`) and its own spoken name ("Shift Command
Z"), so a button never has to repeat itself in JSON.

## Where they live

```
Sources/SeptemberKit/Resources/Panels/
├── text.json                        # right of the keys
├── system.json                      # left of the keys, nearest
├── rectangle.json                   # right of TEXT, the shortcuts of Rectangle
└── Apps/
    ├── generic.json                 # fallback for unknown apps
    └── com.microsoft.VSCode.json    # one file per known app, named by bundle id
```

`PanelStore.bundled()` loads them. The file name is the name of the panel. To
add shortcuts for an app, add `Apps/<bundle id>.json`. No Swift change is
necessary.

`PanelStore.bundled()` throws if a panel is missing, if a file does not
decode, or if two buttons in a panel have the same id. The app then shows the
error and quits. The buttons of `arrows` count as buttons of the panel for this
check.

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
(`"return"`, `"pageDown"`, `"f5"`). Modifier names are `function`, `control`,
`option`, `shift`, and `command`. A letter key is lowercase. For ⇧⌘T, write
`"t"` and put `"shift"` in the modifiers. An unknown modifier or key, an
uppercase letter, or an unknown action type stops the decoding with an error.
