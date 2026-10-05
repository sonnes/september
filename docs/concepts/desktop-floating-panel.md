---
title: Floating panel (desktop)
description: The desktop app has one window, a floating panel, that shows setup, Talk, Notes, Agent, Spaces, voices, settings, Help, and Present.
package: app-ui, desktop
---

# Floating panel

September Desktop has one Tauri window, `panel`. The panel floats above other
apps and shows Talk, Notes, and Agent for one space. Every other page of the
app opens in the panel too.

A user talks beside a call app. The panel keeps the composer next to that app.
The panel resizes to the full screen, and Settings > Panel turns the float off.

## Pages in the panel

| Task                                                  | In the panel                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Setup                                                 | The panel is a normal window with a Dock icon until setup is done.                 |
| Talk, Notes, Agent                                    | A space-mode path, with the space button and the mode switch in the header         |
| Rename a space, delete a space, About                 | The More menu, and the About tab                                                   |
| Export a note                                         | The note actions                                                                   |
| Edit a long note                                      | The user makes the panel larger.                                                   |
| Present a note                                        | The panel fills the screen while the overlay shows.                                |
| Spaces list                                           | All spaces in the space switcher, and Spaces in the More menu                      |
| Voice choice and cloning, Eye tracker, Help, Settings | Items in the More menu. Each page opens in the panel body.                         |

## One set of screens

The panel shows the same `TalkScreen`, `NotesScreen`, and `AgentScreen` as the
web app. A second set of screens doubles the work for each later change to
Talk.

`ChromeContext` in `packages/app-ui/blocks/chrome.tsx` tells a screen which
frame draws around it. The value is `"shell"` or `"panel"`, and the default is
`"shell"`. In `"panel"`, `ScreenHeader` and `SpaceDock` render nothing.
`PanelShell` in `packages/app-ui/layouts/panel.tsx` sets the value and draws
`PanelHeader` in their place.

The panel has no title bar. The macOS window buttons sit over the left end of
the indigo header, and a drag on the free space of the header moves the
window.

| Path              | Left         | Middle                                       | Right |
| ----------------- | ------------ | -------------------------------------------- | ----- |
| A space-mode path | Space button | The Talk, Notes, and Agent switch            | More  |
| Any other page    | Back         | The title of the `APP_NAV` page of the path  | More  |

Back goes to the last space-mode path that the panel showed. If no such path
exists, Back goes to `/spaces`.

On a space-mode path, the More menu holds Phrases, Voice controls, Rename
space, and Delete space. Sound output and Clear the draft show when they apply.
Below them, the menu lists each page of `APP_NAV`: Spaces, Voice, Eye tracker,
Help, and Settings. The space sheet is named Voice controls, so that it is
different from the Voice page. Command-? opens `/help`.

The space switcher sheet lists the spaces by last use, All spaces, and New
space. All spaces opens `/spaces`. With no spaces, a space-mode path shows
`No spaces yet` and New space.

The shared package cannot hide a window, so the desktop bootstrap gives
`PanelShell` one prop, `onHide`.

## One route tree

The window has one webview and one TanStack Query cache, so a write refreshes
every screen through its query keys. `src/main.tsx` builds one route tree.

The setup routes keep `OnboardingLayout`. All other routes sit under a layout
route that renders `PanelShell`. The Help routes need no finished setup. The
other app routes turn back to `/welcome` before setup is done.

| Path                                                                                                  | Screen                         |
| ----------------------------------------------------------------------------------------------------- | ------------------------------ |
| `/welcome`, `/profile`, `/connect`, `/finish`                                                         | The setup steps                |
| `/`                                                                                                   | Redirects to `openingPath`     |
| `/spaces`                                                                                             | `SpacesScreen`                 |
| `/spaces/$slug/talk`, `/spaces/$slug/notes`, `/spaces/$slug/notes/$noteSlug`, `/spaces/$slug/agent`   | Talk, Notes, and Agent         |
| `/voice`, `/voice/clone`, `/eyetracker`, `/help`, `/help/$guideSlug`, `/settings` and its sections    | The pages of the app           |
| `/dashboard`, any other path                                                                          | Redirects to `/`               |

`openingPath(saved, spaces)` in `apps/desktop/src/rules/app-nav.ts` gives the
saved `lastPath` only when that path is exactly one of these pages:

- A space-mode path whose space exists
- A path of `APP_NAV`, or `/voice/clone`
- A settings section
- A connection page of a known provider
- A Help guide that exists

Else it gives Talk of the space with the highest `updated_at`. With no spaces,
it gives `/spaces`.

`SPACE_MODE_PATH` in `apps/desktop/src/rules/panel-nav.ts` matches the Talk,
Notes, note, and Agent paths of a space.

## Width tiers

The panel resizes from 400×560 points to the full screen. Its layout has three
tiers:

| Tier    | Width                | Layout                                                                                                                 |
| ------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Compact | Less than 560 points | One mood menu key, Clear in the More menu. Sheets for Phrases and Voice controls. |
| Regular | 560 to 899 points    | The composer and the history of the web app. Sheets for Phrases and Voice controls.                                   |
| Wide    | 900 points and more  | The full screens of the web app, with the right rail.                                                                 |

`PanelShell` measures the width of the panel for the right rail, the composer,
Clear in the More menu, and the Control mood keys. In the web app, the
composer uses a CSS container query on the screen body, so a phone also shows
the mood menu key.

## Present

`PresentOverlay` opens over the panel, as in the web app. When it opens, it
calls `fullScreen(true)`. When it closes, it calls `fullScreen(false)`. On the
desktop, `fullScreen` calls `panel_present`, which uses `set_simple_fullscreen`.
The panel fills the screen without a new macOS desktop, so it works with the
floating window level. The web version of `fullScreen` does nothing. See
[Present and export a note](note-present-export.md).

## Show and hide the panel

The panel starts hidden, and `src/main.tsx` shows it with `panel_show` at boot.
Before setup is done, the bootstrap calls `panel_setup(true)` first. When setup
becomes done, it calls `panel_setup(false)` and goes to `/`. If setup goes back
to not done, it calls `panel_setup(true)` again.

The Dock icon follows the float choice. `policy(setup, float)` in
`src-tauri/src/window.rs` gives the activation policy:

| State             | Activation policy | Dock icon                            |
| ----------------- | ----------------- | ------------------------------------ |
| Setup is not done | `Regular`         | Shows                                |
| Float on          | `Accessory`       | Hidden. September is not in Command-Tab. |
| Float off         | `Regular`         | Shows                                |

`panel_setup(true)` also turns off always-on-top, all desktops, and the
floating level. The saved float choice does not change. `panel_show` does not
change the activation policy.

A click on the Dock icon shows the panel. The menu bar item holds Show Panel
and Quit September. Control-Option-Space shows the panel from any app. If the
panel is visible and is the key window, the key hides it.

The close button hides the panel, and the draft stays. `native/window.m` lets
the panel float above an app in full screen and follow the user to each macOS
desktop. Float on top in Settings > Panel turns this behavior off or on. It is
on by default.

## Limits

The panel is a normal Tauri window, not a nonactivating `NSPanel`. A click in
the panel makes September the active app, and the call app loses key focus. The
call and its sound continue.

A spike tried a nonactivating panel and merged no code. The `tauri-nspanel`
crate needs `macOSPrivateApi`, which rules out the Mac App Store. A nonactivating
panel can also lose Command-C, Command-V, Command-Z, and Command-Q.

The compact bar, reply to a selection, and snap to a screen edge from
`docs/mocks/2026-10-04-floating-panel.html` are not built.
