---
title: Shortcut panels (macOS)
description: Panels are grids of buttons in JSON. A button types text or presses a key combination. The keypads float beside the keys, and Write has its own panels.
package: keyboard
---

# Shortcut panels (macOS)

Panels are on each side of the macOS keyboard. SYSTEM and My Panel are on the
left. TEXT and RECTANGLE are on the right. RECTANGLE shows only when the
Rectangle window manager is installed (`DetachedPanel.shown(rectangleInstalled:)`).
The panels show only in Type mode (`DetachedPanel.isShown(in:)`).
Cut, Copy, and Paste are buttons at the left of the input bar, so no keypad
has them. While Write is in front, My Panel has a Write tab with the keys of
the paper or of the desk. Each panel is a grid of buttons in a JSON file that
the app loads at launch.

The shortcuts of the app in front are not a panel. They come from its menu
bar and show in the place of the input bar. See the Shortcut Suggestions
section of [keyboard-session.md](keyboard-session.md).

The Apple Accessibility Keyboard uses the same model: `.ascconfig` bundles of
buttons with actions. September has no absolute layout and no modal editor.

## The model

```
PanelDefinition   title, columns, buttons, arrows
  PanelButton     id, label, symbol (SF Symbol), region, action
    WindowRegion  x, y, width, height, in fractions of the screen
    PanelAction   .shortcut(Shortcut) | .sequence([Shortcut]) | .text(String)
                  | .privateText(id) | .scroll(ScrollDirection)
  PanelBlock      columns, buttons
```

My Panel uses the same `PanelAction` and the same JSON for its buttons. Only
My Panel holds `.privateText`. Its JSON has no text and no ID, so it decodes
only with the ID of its button. `PanelAction` gives the keys label, the hint,
the spoken name, and `isText` for both kinds of buttons. `PanelLayout` places
the buttons of a Write panel and of Mine. A text button takes a whole row, and
a key button fills the gap that an earlier key button left.

`arrows` is an optional `PanelBlock` below the grid, with columns of its own.
The Text keypad uses it for an inverted T of arrow keys, in three columns. A
keypad with three columns, in its grid or in its arrows, is three buttons
wide. System has three columns.

A button presses a key combination or types a phrase. A text button uses up
the latched modifiers, the same as a text key.

A shortcut button shows its keys. In a keypad, a button with a `region` or a
`symbol` shows an icon in place of its keys. A `region` draws a small screen
with the part of the window filled, so the Rectangle keypad needs no SF Symbol
for two thirds. A Write panel always shows the keys.

`Shortcut` renders its own hint (`⇧⌘Z`) and its own spoken name ("Shift Command
Z"), so a button never has to repeat itself in JSON.

## Where they live

```
Sources/SeptemberKit/Resources/Panels/
├── text.json              # right of the keys
├── system.json            # left of the keys, nearest
├── rectangle.json         # right of TEXT, the shortcuts of Rectangle
├── phrases.json           # the Phrases panel of Talk mode
├── write.json             # the Write tab on the paper
└── write-documents.json   # the Write tab on the desk
```

`PanelStore.bundled()` loads the keypads and the Write panels, and
`Phrases.bundled()` loads the Phrases panel. The file name is the name of the
panel.

`PanelStore.bundled()` throws if a panel is missing, if a file does not
decode, or if two buttons in a panel have the same id. The app then shows the
error and quits. The buttons of `arrows` count as buttons of the panel for this
check.

## Changing a panel

1. Edit the JSON of the panel:

   ```json
   {
     "title": "System",
     "columns": 3,
     "buttons": [
       { "id": "undo", "label": "Undo",
         "action": { "type": "shortcut", "modifiers": ["command"], "key": "z" } }
     ]
   }
   ```

2. Add a check in `Tests/KitTests/PanelGridTests.swift` if the panel carries
   behaviour worth pinning.

Key names are a single character (`"t"`) or a `VirtualKey` case name
(`"return"`, `"pageDown"`, `"f5"`). Modifier names are `function`, `control`,
`option`, `shift`, and `command`. A letter key is lowercase. For ⇧⌘T, write
`"t"` and put `"shift"` in the modifiers. An unknown modifier or key, an
uppercase letter, an empty sequence, or an unknown action type stops the
decoding with an error. A row of My Panel does not get the checks for the
uppercase letter and the empty sequence.
