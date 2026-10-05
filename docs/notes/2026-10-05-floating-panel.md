---
plan:
  - ../plans/2026-10-05-floating-panel.md
  - ../plans/2026-10-05-single-panel.md
---

# Floating Panel Implementation Notes

- The working tree had changes to `native/audio.m`, `AGENTS.md`, two READMEs, and new `tests/speech_startup.*` files before this work started. They do not belong to this plan.

## Rules (Task B)

- `moodForKey` takes the digit of the key event, such as `"1"`. The caller checks the Control modifier.
- `escapeStep` treats a draft of only spaces as empty, so Escape hides the panel. The draft stays when the panel hides.

## Shared UI (Task C)

- `PanelShell` binds the panel keys itself: Command-K, Command-Option-1 to 3, Escape, Control-0 to Control-5 (compact tier only), and the More menu keys.
- `PanelShell` measures its own width with a `ResizeObserver`. That tier decides the rail slot, Clear in the More menu, and the mood keys. The composer and the history use container queries.
- The container sizes are arbitrary values (`@min-[35rem]`), because Tailwind has no named size at 560.
- Undo, Delete last word, Clear, Speak, and the audio selector are now 44 points in the web app too, because the plan asks for 44 points in all tiers.
- Rename and delete of a space are in the More menu. `DeleteSpaceDialog` is exported from `pages/spaces.tsx` with an `onDeleted` callback. After a delete, the panel goes to `/`.
- Read aloud, Present, Export, and Delete note sit in a row above the note, as in the mock.
- `PanelRail` reads the rail request from `usePanel()`, so the pages did not change. Its Escape runs in the capture phase, so one press does not also hide the panel.
- The compact Talk history shows the last 3 messages and "See all", from the Width Tiers table.
- The mood menu key is labelled "Mood menu", so that its name does not clash with the "Mood: X" keys.
- The icon record in `layouts/app.tsx` is typed `AppPath | "/dashboard" | "/eyetracker"`, so the web app keeps its Today icon.

## Native Windows (Task A)

- `tauri-plugin-global-shortcut` is pinned to `~2.3`. Version 2.4.0 needs tauri 2.12, which would bump about 250 lock entries.
- If another app owns Control-Option-Space, the key registration fails without an error. The menu bar item still shows the panel.
- `BackendState.repository` is now `pub(crate)`, so that `window.rs` can read and write `panel-float`.
- `cargo test` fails in `tests/virtual_microphone.rs` with Core Audio error -10875. It fails the same way at HEAD with only the earlier `audio.m` change. The installed September.app was running during the test.

### A4 Spike Findings

No spike code is merged.

- `tauri-nspanel` 2.1.0 supports tauri 2.11.5 and the nonactivating style. It needs `macOSPrivateApi`, which rules out the Mac App Store.
- An own `object_setClass` to an `NSPanel` subclass drops the window-class overrides of tao. A style change after the window exists can need an order-front to take effect.
- In a nonactivating panel, Command-C, Command-V, Command-Z, and Command-Q can fail to reach the app menu. The manual check must test them with keystrokes, IME, and VoiceOver.

## Desktop Wiring (Task D)

- The wiring in `os.ts` and `main.tsx` has no tests, because the Tauri module does not run in Node. The build checks it, and E1 checks it by hand.

## After the Plan

- The panel opens at 834×1194, the 11-inch iPad Pro portrait size, not 440×820. At this width the panel shows the regular tier. On a screen shorter than 1194 points, macOS limits the height of the window.
- Settings > Panel (`/settings/panel`) is a desktop-only section with one switch, Float on top. Rust keeps the choice in the `panel-float` setting, and the float is on until the user turns it off. Off makes the panel a normal window: it is not always on top, it does not show over an app in full screen, and it does not follow the user to each desktop.
- The screen of the section is `apps/desktop/src/panel-settings.tsx`, because no other app has the panel. The icon record in `packages/app-ui/layouts/settings.tsx` takes `"/settings/panel"` in addition to the paths of each app.

## One Panel Window

These notes belong to `docs/plans/2026-10-05-single-panel.md`.

### Rust

- `policy(setup, float)` is a pure rule with its own `Policy` enum, so a unit test reads it without Tauri. `apply_float` maps it to `ActivationPolicy`.
- `panel_setup(true)` also turns off always-on-top, all desktops, and the floating level. The saved float choice does not change.
- `panel_show` does not change the activation policy. Only `panel_setup` and `panel_set_float` change it.
- The tray holds Show Panel and Quit September. A click on the Dock icon shows the panel.

### Rules

- `openingPath` reopens a saved path only on an exact match. The match is an `APP_NAV` path, a settings section, a known connection page, a Help guide that exists, or `/voice/clone`. A space-mode path reopens only when its space exists.
- `SPACE_MODE_PATH` is exported from `panel-nav.ts`, so `openingPath` reads the same pattern as `isSpaceModePath`.
- The plan asked for `backPath` in `panel-nav.ts`. It is not there, because nothing in the desktop app calls it. `PanelShell` keeps the last space path in its own state, because `packages/app-ui` cannot import the desktop rules. After a reload, Back goes to `/spaces` until a space opens.

### Shared UI

- The space Voice sheet is named "Voice controls", so that it is different from the Voice page in the More menu.
- On a page that is not a space, the header shows Back and the title of the `APP_NAV` page that the path belongs to. For example, `/settings/writing` shows Settings.
- Command-? opens `/help`.
- "No spaces yet" shows only on a space-mode path. The other pages show as usual with no spaces.
- `NoteActions` no longer takes `spaceId`, because Present opens the overlay in the same window.
- `PresentOverlay` calls `fullScreen(true)` when it opens and `fullScreen(false)` when it closes.

### Desktop Wiring

- Help is reachable before setup is done. The Help routes sit under the `PanelShell` layout route but outside the setup guard.
- `FinishStep` still goes to `/dashboard`. `/dashboard` redirects to `/`.
- If setup goes back to not done, the bootstrap calls `panel_setup(true)` again.
