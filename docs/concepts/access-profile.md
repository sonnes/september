---
title: The access profile
description: One profile, chosen at setup and changed in Settings, sets the target size, gaps, word size, dwell, scan, text size, theme, contrast, motion, and click of every screen.
package: core, app-ui, desktop, web
---

# The Access Profile

The access profile records how the person chooses things. Setup asks for it in
the How you choose step, after Welcome. The Access section of Settings asks the
same questions again. The profile is part of the setup, so it travels in the
backup of both apps.

`packages/core/rules/access.ts` holds the profile and its rules:

- `AccessProfile` has the input method, the text size, the contrast, the
  motion, the theme, and the click sound. It can also hold a dwell time and a
  scan step that the person set.
- `parseAccess` reads a saved profile. A bad field takes its default.
- `reachFor` turns the profile into a `Reach`: what the profile asks of the
  screen.
- `isDark` tells if the screen shows the dark theme.
- A dwell time or a scan step is from 0.3 to 30 seconds. WCAG 2.2.1 asks that
  a person can make a time limit ten times as long as the default.

## Reach

| Field | Touch, mouse, keyboard | Eyes | Switch |
| --- | --- | --- | --- |
| Target size | 48 px | 88 px | 64 px |
| Gap between targets | 8 px | 24 px | 16 px |
| Word size on a tile | 16 px | 22 px | 20 px |
| Dwell time | Off | 0.8 s | Off |
| Scan step | Off | Off | 1.2 s |
| Stripes shown | 6 | 4 | 4 |
| Words in a slice | 6 | 4 | 4 |
| Motion | Full | Reduced | Reduced |

The text size multiplies the word size and every text role: Standard is 1,
Large is 1.25, and Largest is 1.5. Eyes and Switch always reduce motion. A
Reduced choice reduces motion for every input method.

## When an Answer Applies

A new input method changes how every key responds. An arrow key that passes
Switch must not start the scan, so a new input method waits for a key:

- In setup, the answers of How you choose apply when the person chooses
  Continue.
- In Settings, a new input method applies when the person chooses its Use key,
  for example Use Eyes. Keep puts back the method in use. The other answers
  save at once.

## On the Page

`ApplyAccess` in `packages/app-ui/blocks/access.tsx` puts the profile on the
root element while a screen of the app shows:

- the `dark` class for the dark theme,
- `data-input`, `data-motion`, and `data-contrast`,
- the custom properties `--reach-target`, `--reach-gap`, `--reach-word`, and
  `--reach-scale`.

The web app shell, the desktop panel, and the setup layout mount it. When the
app unmounts, `ApplyAccess` removes all of them. Thus the landing page does not
take the dark theme or the sizes of the app. Setup passes the profile of its
draft.

`theme.css` reads these values. Every text role grows by `--reach-scale`. High
contrast sets every line and every quiet word to the full ink.

## Input

`InputLayer` gives the input of the profile to the whole screen. The same
shells mount it.

Each accepted press squeezes the key, shows a check, and plays a short click.
With reduced motion, two rings show in place of the squeeze. The click is off
while the voice speaks, and off when the person sets Click sound to Off. The
browser starts the sound only after a real press, so a dwell press before the
first real press is silent.

Dwell and scan press buttons, links, summaries, radios, tabs, options, and menu
items, including radio and checkbox menu items. They never press the edge strip
that toggles the sidebar, or a key marked `data-access-skip`, such as the skip
link. A Radix menu or select opens on a pointer press, not on a click. Thus
dwell and scan send a pointer press before the click to a key that opens one.

### Eye Gaze

With Eyes, a gaze on a key fills it from the bottom in amber. Ink marks at the
fill level show the progress without color. When the dwell time ends, the key
presses. A dwell on a text field puts the focus in the field. After a dwell or
a click, the next dwell starts only when the gaze moves half a target away from
the press. Thus a steady gaze does not press the tile that slides into the
place of a taken tile.

### Switch Scanning

With Switch, Space moves the scan on and Enter chooses. The scan also moves on
by itself after the scan step, so one switch on Enter is enough.

The scan steps through the groups marked `data-scan-group` first, then through
the keys of the chosen group. A group takes the focus while the band is on it,
so a screen reader reads its name. After the last key of a group, the band goes
back on the group, so the next step leaves it. A key that is not in a group is
a step of its own, so every screen can be scanned. A group that the layout
dissolves with `display: contents` has no box for the band, so the scan steps
through its keys one by one.

These are the groups:

| Place | Groups |
| --- | --- |
| Web app shell | The Main menu of the sidebar |
| Desktop panel | The header |
| Every screen header | The header |
| Talk | Messages, Phrases, each stripe, Words, Edit, Voice |
| Dock | Spaces, Space mode |
| Rail | Panel rail |
| Setup | Onboarding progress |
| Present | Previous, Stop, and Next |

The scan skips keys that the screen does not show. If a sheet, a dialog, an
open menu, or the phone sidebar opens, the scan starts again at its first key
and stays inside it. Enter presses a key that the person moved the focus to
with Tab. The scan starts by itself when the screen opens. After a keyboard key
types in a text field, Space and Enter type there, and the scan waits, until
the field loses the focus. A field that only has the focus, such as the
composer when Talk opens, does not stop the scan.

`ScanPauseKey` stops the scan. It shows only while a switch scans. The web app
puts it at the foot of the sidebar, and at the foot of the screen on a phone,
where the screen keeps room for it. The desktop panel puts it in the header,
and setup puts it in the setup sidebar. While the scan waits, the key reads
Resume scan, and the next press of the switch starts the scan again.
