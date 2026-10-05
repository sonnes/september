# One Panel Window for the Desktop App

Status: Approved 2026-10-05. Follows `docs/plans/2026-10-05-floating-panel.md`, which is built but not committed.

## Scope

The desktop app keeps one window, `panel`. The `main` window goes. Every page of the main window opens in the panel.

| Page | In the panel |
| --- | --- |
| Talk, Notes, Agent | As today |
| Spaces list | "All spaces" in the space switcher sheet, and Spaces in the More menu |
| Voice, Voice clone, Eye tracker, Help, Settings | Items in the More menu. Each page opens in the panel body. |
| Setup | The first launch shows setup in the panel as a normal window. The saved float choice applies when setup is done. |
| Present | The panel fills the screen while the overlay shows, then goes back to its size. |

The web app does not change.

## Design Decisions

Only one window was on screen at a time, so the main window gave no view that the panel cannot give. The panel resizes to the full screen, and Settings > Panel turns the float off.

One window has one webview and one TanStack Query cache. The events between windows, the second route tree, the hand-off routes, and the data refresh between windows all go. The two refresh gaps in the notes file go with them.

The Dock icon follows the float choice. With the float on, September has no Dock icon and is not in Command-Tab, as a floating panel. With the float off, September is a normal app with a Dock icon. During setup, September is a normal app.

Present uses `set_simple_fullscreen`. It fills the screen without a new macOS desktop, so it works with the floating window level.

## Contracts

### Window

| Label | Size | Min size | Other |
| --- | --- | --- | --- |
| `panel` | 834 x 1194 | 400 x 560 | Starts hidden. The JS shows it at boot. |

The `main` window, `window_show`, `window_front`, the `front-window` setting, Command-1, and Command-2 go.

### Rust Commands

| Command | Arguments | Result |
| --- | --- | --- |
| `panel_show` | none | Shows and focuses the panel. |
| `panel_hide` | none | Hides the panel. |
| `panel_float` | none | As today. |
| `panel_set_float` | `on: bool` | As today, and sets the activation policy: `Accessory` when on, `Regular` when off. |
| `panel_setup` | `on: bool` | On: a normal window with `Regular`, and the setting does not change. Off: applies the saved float choice. |
| `panel_present` | `on: bool` | On: `set_simple_fullscreen(true)`. Off: `set_simple_fullscreen(false)`. |

The tray menu holds Show Panel and Quit September. The Dock reopen and Control-Option-Space show the panel. Close hides the panel, as today.

### Routes

One tree. The setup routes keep `OnboardingLayout`. All other routes sit under a layout route that renders `PanelShell`.

| Path | Screen |
| --- | --- |
| Setup routes | As today |
| `/` | `openingPath(saved, spaces)` |
| `/spaces` | `SpacesScreen` |
| `/spaces/$slug/talk`, `/spaces/$slug/notes`, `/spaces/$slug/notes/$noteSlug`, `/spaces/$slug/agent` | As in the panel today |
| `/voice`, `/voice/clone`, `/eyetracker`, `/help`, `/help/$guideSlug`, `/settings` and its children | As in the main window today |
| `/dashboard`, any other path | Redirects to `/` |

`openingPath(saved, spaces)` in `apps/desktop/src/rules/app-nav.ts` gives:

1. The saved path, if it is a space-mode path and its space exists.
2. The saved path, if it is a page of `APP_NAV`, a settings section, a connection page, or a Help guide.
3. Else, the Talk path of the space with the highest `updated_at`.
4. Else, `/spaces`.

One setting, `lastPath`, holds the last path. The `panel-path` setting goes.

### Platform Functions

`@platform/services/os` loses `windowRole`, `showWindow`, `presentInMain`, and `onPresentRequest`. It gains `fullScreen(on: boolean): Promise<void>`. The desktop version calls `panel_present`. The web version is a no-op.

### Panel Header

| Path | Left | Middle | Right |
| --- | --- | --- | --- |
| A space-mode path | Space button | Talk, Notes, Agent switch | More |
| Any other page | Back | The page title | More |

Back goes to the last space-mode path. If none exists, Back goes to `/spaces`.

The More menu keeps its space items. In place of "Open main window", it lists each page of `@platform/rules/app-nav` `APP_NAV` with its title. The space switcher sheet gets an "All spaces" row that opens `/spaces`.

Each page keeps its controls. If a page has a control in `ScreenHeader`, that control moves into the page body or the panel header, because `ScreenHeader` renders nothing in the panel.

## Tasks

Each task is one subagent. The "Files" line is the set of files that the task owns. Every task obeys the TDD rule of the repository: write the failing test, run it and see it fail, write the minimum code, run it and see it pass. Do not write tests that only show that removed code is absent.

### Phase 1: Parallel

#### A. Rust

Files: `apps/desktop/src-tauri/**`, except the uncommitted `native/audio.m`, `README.md`, and `tests/speech_startup.*` changes, which do not belong to this work.

1. Remove the `main` window from `tauri.conf.json` and `capabilities/default.json`.
2. Replace the window commands with the commands of Contracts. Remove `front-window` and `front_label`.
3. Put the activation policy rule in a pure function with a unit test: setup gives `Regular`, float on gives `Accessory`, float off gives `Regular`.
4. Update the tray, the Dock reopen, the global key, and close for one window.
5. Update `tests/window_state.rs` for one window.

#### B. Rules

Files: `apps/desktop/src/rules/app-nav.ts`, `apps/desktop/src/rules/panel-nav.ts`, and their tests in `apps/desktop/tests/`.

1. Write `openingPath(saved, spaces)` as in Contracts.
2. Remove `bootChoice`, `isOwnEvent`, `routeTreeFor`, `dataChangedPayload`, `panelStray`, `panelOpeningPath`, and `WindowRole`. Keep `isSpaceModePath`.
3. Add `backPath(lastSpacePath)`: the last space-mode path, or `/spaces`.

#### C. Shared UI

Files: `packages/app-ui/**`, `apps/web/src/services/os.ts`, and `apps/web/src/*.test.tsx`.

1. `PanelHeader` follows the Panel Header table. The More menu lists `APP_NAV`. The space switcher gets "All spaces".
2. `PanelShell` loses `onHelp`. Help is a page of `APP_NAV`.
3. Present opens `PresentOverlay` as the web app does. `PresentOverlay` calls `fullScreen(true)` when it opens and `fullScreen(false)` when it closes.
4. Remove `PresentHost`, and the window functions of Platform Functions from web `os.ts`. Add the `fullScreen` no-op.
5. Make sure that `SpacesScreen`, `VoiceScreen`, `VoiceCloneScreen`, `HelpScreen`, `SettingsLayout`, and the settings pages keep their controls in the panel chrome.

Tests: the header shows Back and the page title on `/settings`, and Back goes to the last space. The More menu opens each `APP_NAV` page. "All spaces" opens `/spaces`. Present calls `fullScreen(true)`, and its close calls `fullScreen(false)`. Each page keeps its controls in the panel chrome.

### Phase 2: Desktop Wiring

Files: `apps/desktop/src/main.tsx`, `apps/desktop/src/services/os.ts`, `apps/desktop/src/services/data.ts`, `apps/desktop/src/panel-settings.tsx`, `apps/desktop/tests/*.test.mjs`.

1. Build the one route tree of Contracts.
2. At boot, show the panel. If setup is not done, call `panel_setup(true)` first. When setup finishes, call `panel_setup(false)` and go to `/`.
3. `onResolved` saves `lastPath` and sets the window title with `windowTitle`.
4. Remove the window events, `data-changed`, `refreshSettings`, Command-1, Command-2, `openInPanel`, `openInMain`, `currentPanelPath`, and `savePanelPath`.
5. Add `fullScreen` and update the window commands in `os.ts`. Use `panel_show` and `panel_hide`.
6. `PanelShell` gets `onHide` only.

### Phase 3: Verify and Document

#### E1. Manual QA

Run `make desktop-dev`.

1. First launch: setup shows in a normal window with a Dock icon. After setup, Talk of the new space shows, and the panel floats with no Dock icon.
2. The More menu opens Spaces, Voice, Eye tracker, Help, and Settings in the panel. Back returns to the last space.
3. Settings > Panel: turn the float off. The Dock icon shows and the panel is a normal window. Turn it on. The Dock icon goes.
4. Present a note. The panel fills the screen. Escape returns the panel to its size and place.
5. Rename a space in Agent. The Spaces page shows the new name.
6. Quit and launch. The panel opens at its last size and on its last page.
7. Resize from 400 points to the full screen on a settings page and on Talk. No control is cut off.

#### E2. Documentation

1. `apps/desktop/README.md`, `apps/desktop/src-tauri/README.md`, `apps/desktop/CLAUDE.md`, and `packages/app-ui/README.md`: one window, the commands, the routes, the header, the Dock rule, and Present.
2. `docs/concepts/desktop-floating-panel.md`, `space-navigation.md`, and `note-present-export.md`: remove the main window, the events, and the hand-off routes.
3. `DESIGN.md` Decisions Log: change the 2026-10-05 row to one window.
4. The mock: replace the "Main Window" section with the pages in the panel.
5. `docs/notes/2026-10-05-floating-panel.md`: remove the notes that the main window made false, and add the decisions of this work.
6. Set the status of `docs/plans/2026-10-05-floating-panel.md` to "Superseded in part by `2026-10-05-single-panel.md`".

## Checks Before Each Commit

From `apps/desktop/`: `pnpm build`, `pnpm test`.
From `apps/desktop/src-tauri/`: `cargo test --no-fail-fast`, `SEPTEMBER_WINDOW_TEST=1 cargo test --test window_state`, `cargo clippy --all-targets --all-features -- -D warnings`, `cargo fmt --all -- --check`.
From the root: `pnpm --filter core --filter web --filter desktop test`, `pnpm --filter web build`.

`tests/virtual_microphone.rs` fails at HEAD with Core Audio error -10875. This work does not change it.

## Orchestration

The lead agent runs the phases in order and writes no code. Each subagent prompt holds the task, the Contracts section, its files, and this rule: "Change no file outside your list. If you need a change outside your list, stop and report it."
