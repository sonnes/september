# Floating Panel for the Desktop App

Status: Superseded in part by `2026-10-05-single-panel.md`. Mock: `docs/mocks/2026-10-04-floating-panel.html`.

## Scope

The desktop app gets a second Tauri window, `panel`. The panel floats above other apps and shows Talk, Notes, and Agent for one space.
Talk, Notes, and Agent leave the main window. The user moves between the two windows with Command-1 and Command-2.

The main window follows the "Main Window" section of the mock. Its sidebar holds Spaces, Voice, Eye tracker, Help, and Settings.
Today (`/dashboard`) leaves the sidebar, because the mock has no Today. The main window opens on Spaces.

| Task | Window |
| --- | --- |
| Setup | Main window. The panel opens when setup is done. |
| Talk, Notes, Agent | Panel |
| Rename a space, delete a space, About | Panel |
| Export a note | Panel |
| Edit a long note | Panel. The user makes the panel larger. |
| Present a note | Main window, over the full screen |
| Spaces list, new space | Main window. A press on a space opens it in the panel. |
| Voice choice and cloning, Eye tracker, Settings, Help | Main window |

The mock puts Export, long notes, and delete in the main window. This plan keeps them in the panel, because the main window has no note screen or space screen after this change.

The panel is resizable from 400 by 560 points to the full screen. A narrow panel shows the compact layout of the mock.
A wide panel shows the full Talk, Notes, and Agent screens of today, with the panel header in place of the sidebar and the dock.

This plan does not build these parts of the mock:

- The compact bar (Command-M).
- Reply to a selection (Shift twice), and the Accessibility prompt for it.
- Snap to a screen edge.
- Any change to `apps/keyboard`.

The web app keeps its current routes and its current shell.

## Design Decisions

The panel reuses the current `TalkScreen`, `NotesScreen`, and `AgentScreen`.
A second set of screens would double the work for each later change to Talk.
The pages change in one way only: they ask a chrome context which header, dock, and rail to draw.

Each window builds its own route tree from the same bundle. The panel owns the paths `/spaces/$slug/talk`, `/spaces/$slug/notes`, `/spaces/$slug/notes/$noteSlug`, and `/spaces/$slug/agent`.
The shared pages link to these paths today, so the links inside Talk, Notes, and Agent work in the panel with no change.
In the main window, the same four paths are hand-off routes. They send the path to the panel, show the panel, and return the main window to `/spaces`.
The Spaces list and the new-space flow therefore need no change.

Width tiers come from CSS container queries on the screen body, not from the window width.
The same `Composer` then fits a 440-point panel, a full-screen panel, and the web app on a phone.
This changes the web app below 560 pixels of width: the mood keys become one menu key there too. The plan accepts that change.

The panel starts as a normal always-on-top Tauri window. A click in the panel makes September the active app, and the call app loses key focus.
The call continues and keeps its audio. A nonactivating `NSPanel` keeps the call app active, but it needs AppKit code that Tauri does not supply.
Task A4 is a time-boxed spike for it. The rest of the plan does not depend on the spike.

Each window has its own webview and its own TanStack Query cache. Both read the same SQLite database through Rust.
A write in one window must refresh the other window, so each mutation sends a Tauri event that the other window reads.

Present needs the full screen, and the main window has no note screen after this change.
A `PresentHost` in the main window listens for a request from the panel, loads the note, and shows the current `PresentOverlay` over the screen that is open.
Present stays an overlay, as `apps/desktop/CLAUDE.md` requires.

## Contracts

All tasks use these names. A task that needs a different name stops and reports it.

### Windows

| Label | Created | Visible at launch | Size | Min size | Other |
| --- | --- | --- | --- | --- | --- |
| `main` | `tauri.conf.json`, as today | No | 1376 x 1032 | 760 x 600 | Title from `windowTitle`, as today |
| `panel` | `tauri.conf.json` | No | 440 x 820 | 400 x 560 | `alwaysOnTop`, `visibleOnAllWorkspaces`, `skipTaskbar`, title `September` |

The window-state plugin restores the size and position of both windows by label.
The JS of each window shows its own window at boot (see Task D2).

### Rust Commands

| Command | Arguments | Result |
| --- | --- | --- |
| `window_show` | `label: "main" \| "panel"` | Shows and focuses the window. Hides the other window. Sets the activation policy. |
| `window_hide` | `label` | Hides the window. |
| `window_front` | none | Returns the label of the window that the user saw last: `"main"` or `"panel"`. |

`window_show("main")` sets `ActivationPolicy::Regular`, so the Dock icon shows.
`window_show("panel")` sets `ActivationPolicy::Accessory`, so the Dock icon goes.
Rust keeps the label of the last shown window in the `front-window` setting.

### Events

| Event | Payload | Sender | Receiver |
| --- | --- | --- | --- |
| `data-changed` | `{ from: label, keys: string[][] }` | The window that wrote | The other window invalidates each query key |
| `panel-open` | `{ path }` | `main` | `panel` navigates to the path |
| `present-note` | `{ spaceId, noteSlug }` | `panel` | `main` loads the note and shows `PresentOverlay` |

A window ignores a `data-changed` event that it sent.

### Routes

`main.tsx` reads `windowRole()` and builds one of two route trees.

Main window tree:

| Path | Screen |
| --- | --- |
| Setup routes | As today |
| `/spaces`, `/voice`, `/voice/clone`, `/eyetracker`, `/help`, `/help/$guideSlug`, `/settings` and its children | As today |
| `/dashboard` | Redirects to `/spaces` |
| `/spaces/$slug/talk`, `/spaces/$slug/notes`, `/spaces/$slug/notes/$noteSlug`, `/spaces/$slug/agent` | Hand-off: `openInPanel(path)`, then redirect to `/spaces` |
| `/` | `openingPath(lastPath)`, as today |

Panel tree, under a `panelRoute` layout that renders `PanelShell`:

| Path | Screen |
| --- | --- |
| `/` | Redirects to `panelOpeningPath`. With no spaces, shows the empty state. |
| `/spaces/$slug/talk` | `TalkScreen` |
| `/spaces/$slug/notes` | `NotesScreen` |
| `/spaces/$slug/notes/$noteSlug` | `NotesScreen` |
| `/spaces/$slug/agent` | `AgentScreen` |
| Any other path | Redirects to `/` |

Both trees keep the setup guard of today.

### Settings

| Key | Value | Owner |
| --- | --- | --- |
| `front-window` | `"main"` or `"panel"` | Rust |
| `panel-path` | The last path of the panel | `os.ts` |
| `lastPath` | The last path of the main window, as today | `os.ts` |

### Shared UI

`packages/app-ui/blocks/chrome.tsx` exports a `ChromeContext` with the value `"shell"` or `"panel"`. The default is `"shell"`.

- In `"panel"`, `ScreenHeader` and `SpaceDock` render nothing. `PanelShell` supplies the header.
- In `"panel"`, `PanelShell` supplies a `RightPanelSlot` in the wide tier only. In the other tiers, `RightPanel` has no slot and renders nothing, as it does today when no slot exists.
- In `"shell"`, every page renders as it does today. The web app always uses `"shell"`.

New platform functions in `@platform/services/os`, with no-op versions in `apps/web/src/services/os.ts`:

| Function | Desktop | Web |
| --- | --- | --- |
| `windowRole(): "main" \| "panel"` | The label of the current window | `"main"` |
| `showWindow(label)` | Calls `window_show` | No-op |
| `presentInMain(spaceId, noteSlug)` | Calls `window_show("main")`, then sends `present-note` | No-op |
| `onPresentRequest(listener): () => void` | Calls the listener for each `present-note` event | Returns a no-op |

Desktop-only functions in `apps/desktop/src/services/os.ts`: `openInPanel(path)`, `currentPanelPath()`, `savePanelPath(path)`.

### Width Tiers

The container is the screen body. Tailwind v4 `@container` and its named sizes set the tiers.

| Tier | Container width | Composer row | History | Phrases and Voice |
| --- | --- | --- | --- | --- |
| Compact | Less than 560 | Undo, delete word, the mood menu key, Speak. The audio selector moves to a line below the composer. Clear moves into the More menu. | The last 3 messages, and "See all" | A sheet over the panel |
| Regular | 560 to 899 | As today | As today | A sheet over the panel |
| Wide | 900 and more | As today | As today | The right rail and the 320-point card, as today |

### Keys

| Key | Where | Action |
| --- | --- | --- |
| Command-1 | Both windows | `showWindow("panel")` |
| Command-2 | Both windows | `showWindow("main")` |
| Command-K | Panel | Opens the space switcher |
| Command-Option-1, 2, 3 | Panel | Talk, Notes, Agent |
| Escape | Panel | Stops the voice. Else closes the open sheet or menu. Else, with an empty draft, hides the panel. |
| Control-1 to Control-5, Control-0 | Panel, compact tier | Sets the mood. Control-0 clears it. |
| Control-Option-Space | Global | Shows the panel, or hides it when it is in front |

## Tasks

Each task is one subagent. The "Files" line is the set of files that the task owns. A task changes no file that another task in the same phase owns.

Every task obeys the TDD rule of the repository:

1. Write the failing test.
2. Run it and see it fail.
3. Write the minimum code.
4. Run it and see it pass.

Every task reads `CLAUDE.md`, `DESIGN.md`, and the `CLAUDE.md` and `README.md` of each module it changes before it starts.

### Phase 1: Parallel

#### A. Native Windows (Rust)

Files: `apps/desktop/src-tauri/**`.

A1. Panel window and window commands.

1. Add the `panel` window to `tauri.conf.json` with the values in Contracts.
2. Set `visible: false` on `main` and `panel`.
3. Add `panel` to the windows of `capabilities/default.json`. Add the permissions that the commands and events need.
4. Add `window_show`, `window_hide`, and `window_front` in a new `src/window.rs`. Register them in `lib.rs`.
5. In `lib.rs`, handle `WindowEvent::CloseRequested` for both labels. Prevent the close and hide the window. The draft and the close guard then stay as they are.
6. Make sure that Command-Q and `RunEvent::Exit` still stop speech, the microphone, and gaze.

Tests: extend `tests/window_state.rs`, or add `tests/windows.rs` with the same self-spawning harness. The test shows the panel, quits, starts again, and reads the same size and position for both labels. A second test closes the panel and reads that the process still runs and the panel is hidden.

A2. Menu bar item and global key.

1. Enable the `tray-icon` feature of `tauri`. Add the September keycap as a template image.
2. The tray menu holds: Show Panel, Open September, Quit September.
3. Add `tauri-plugin-global-shortcut`. Register Control-Option-Space. A press shows the panel, or hides it when the panel is the key window.

Tests: a unit test for the toggle rule (`panel visible and key` gives hide, all other states give show), in a pure function in `src/window.rs`.

A3. Full-screen apps.

1. Add `native/window.m` with `september_window_float(void *nsWindow)`. It adds `NSWindowCollectionBehaviorFullScreenAuxiliary` and `CanJoinAllSpaces`, and sets the level to `NSFloatingWindowLevel`.
2. Compile it in `build.rs` and link AppKit.
3. Call it from setup for the `panel` window with `ns_window()`.

Tests: none in code. Task E1 checks it by hand over a full-screen app.

A4. Spike: nonactivating panel. Time box: one day.

1. Try the `tauri-nspanel` crate, and an own `object_setClass` to an `NSPanel` subclass with `NSWindowStyleMaskNonactivatingPanel` in `native/window.m`.
2. Make sure that the webview in the panel still takes keystrokes, IME input, and VoiceOver focus.
3. Make sure that a Zoom or FaceTime call stays the active app while the user types in the panel.
4. Write the result in the notes file. Do not merge the spike unless all three checks pass.

#### B. Rules (TypeScript)

Files: `apps/desktop/src/rules/panel-nav.ts`, `apps/desktop/src/rules/app-nav.ts`, `apps/desktop/tests/panel-nav.test.mjs`, the current test of `app-nav.ts`, `packages/core/rules/panel.ts`, and the core test of that file.

B1. Panel paths, in `apps/desktop/src/rules/panel-nav.ts`, tested with `node --test`:

- `isSpaceModePath(path)` is true for the four space-mode paths of the Routes table.
- `panelOpeningPath(saved, spaces)` gives the saved path when its space still exists, else the Talk path of the most recent space, else `/`.
- `bootChoice({ role, setupDone, front })` gives `"show"` or `"stay-hidden"` for each window:

  | Role | Setup done | `front` | Result |
  | --- | --- | --- | --- |
  | `main` | No | any | `"show"` |
  | `main` | Yes | `"main"` | `"show"` |
  | `main` | Yes | `"panel"` or none | `"stay-hidden"` |
  | `panel` | No | any | `"stay-hidden"` |
  | `panel` | Yes | `"panel"` or none | `"show"` |
  | `panel` | Yes | `"main"` | `"stay-hidden"` |

- `isOwnEvent(from, role)` is true when the event came from this window.

B2. Main navigation, in `apps/desktop/src/rules/app-nav.ts`:

1. Remove `/dashboard` from `APP_NAV`.
2. `openingPath` gives `/spaces` when the saved path is unknown, and when `isSpaceModePath(saved)` is true. A saved Talk path from an older version then opens the Spaces list, not a hand-off.
3. `windowTitle` keeps its current names for the remaining paths.

B3. Shared key rules, added to `packages/core/rules/panel.ts`, because the shared UI uses them:

- `escapeStep({ speaking, sheetOpen, draft })` gives `"stop"`, `"close"`, `"hide"`, or `"none"`, in the order of the Keys table.
- `moodForKey(key)` gives the mood for Control-1 to Control-5, `null` for Control-0, and `undefined` for other keys.

Task C imports `escapeStep` and `moodForKey` by these names while Task B writes them.

#### C. Shared UI (app-ui)

Files: `packages/app-ui/blocks/chrome.tsx` (new), `packages/app-ui/layouts/panel.tsx` (new), `packages/app-ui/blocks/panel-header.tsx` (new), `packages/app-ui/blocks/present.tsx`, `packages/app-ui/blocks/screen.tsx`, `packages/app-ui/blocks/space.tsx`, `packages/app-ui/blocks/space-panel.tsx`, `packages/app-ui/pages/talk.tsx`, `packages/app-ui/pages/notes.tsx`, `packages/app-ui/pages/agent.tsx`, `apps/web/src/services/os.ts`, and new tests in `apps/web/src/*.test.tsx`.

C1. Chrome context.

1. Add `ChromeContext` and `useChrome()`.
2. `ScreenHeader` and `SpaceDock` return `null` when the chrome is `"panel"`.

Tests (web, vitest): render `TalkScreen` inside `ChromeContext` `"panel"`, and assert that the mode switch of the dock and the space tabs are absent. Assert that they are present with the default value. This negative assertion is legal: it enforces the current state behavior of the panel.

C2. Responsive composer.

1. Mark the screen body of each page as a container (`@container`).
2. In `Composer`, show `MoodKeys` from the regular tier and up. In the compact tier, show one mood menu key. It shows the current mood and opens a menu of the five moods and "No mood".
3. In the compact tier, move `AudioSelector` to a line below the composer. Keep it visible on a Mac with one output, as `apps/desktop/CLAUDE.md` requires.
4. In the compact tier, show Clear in the More menu of the panel header, not in the composer row.
5. Keep every control at 44 points or more in all tiers.

Tests: the mood menu sets the mood, and a second choice of the same mood clears it. The test calls `onMood` through the menu. It does not test which tier shows.

C3. Panel shell.

1. `PanelShell` in `layouts/panel.tsx` renders `ChromeContext` `"panel"`, `PanelHeader`, and an `<Outlet/>`. In the wide tier it also renders the `RightPanelSlot` target.
2. `PanelHeader` holds the space button, the Talk, Notes, and Agent switch, and the More button. It uses the indigo sidebar tokens.
3. The space button opens the space switcher sheet: search, the spaces by last use, the digits 1 to 9 while the sheet is open, and New space.
4. The More menu holds Phrases, Voice, Sound output, Clear the draft (compact tier only), Open main window, and Help, each with its key. Help calls `showWindow("main")` and opens `/help` there.
5. Phrases and Voice open the current `Phrases` and `SpeechSettings` as a sheet below the header. In the wide tier they open the current right rail instead. `PanelRail` takes a prop for this and keeps `currentPanel` and `rememberPanel`.
6. Escape follows `escapeStep` from `packages/core/rules/panel.ts`. Control-1 to Control-5 follow `moodForKey`.
7. With no spaces, the panel shows an empty state with New space.
8. Rename, delete, and About stay where the Talk and Notes screens have them today. If a control of today sits in `ScreenHeader` or `SpaceDock`, move it into `PanelHeader` or the More menu so that it stays reachable in the panel.

Tests:

- The mode switch navigates to the Talk, Notes, and Agent path of the same space.
- The space switcher filters by title and opens the chosen space in the current mode.
- Escape closes an open sheet before it hides the panel.
- New space creates a space and opens it.
- Rename and delete are reachable in the panel.

C4. Present from the panel.

1. In `NoteActions`, when `windowRole()` is `"panel"`, Present calls `presentInMain(spaceId, noteSlug)` instead of opening the overlay.
2. Add `PresentHost` to `blocks/present.tsx`. It subscribes with `onPresentRequest`, loads the note through the current note query, and renders `PresentOverlay`. Escape and the end of the note close it, as today.
3. Add the four platform functions of Contracts to `apps/web/src/services/os.ts` as no-ops.

Tests: Present in the panel calls `presentInMain` with the space and the note. A request to `PresentHost` shows the overlay with the note text. Present in the web app opens the overlay, as today.

### Phase 2: Desktop Wiring

Starts when Phase 1 is green. One subagent.

#### D. Desktop Bootstrap

Files: `apps/desktop/src/main.tsx`, `apps/desktop/src/services/os.ts`, `apps/desktop/src/services/data.ts`, `apps/desktop/src/rules/panel-nav.ts`, `apps/desktop/tests/*.test.mjs`.

D1. Platform functions.

1. Add `windowRole`, `showWindow`, `presentInMain`, and `onPresentRequest` to `os.ts`, over the commands and events of Contracts.
2. Add `openInPanel`, `currentPanelPath`, and `savePanelPath`.

D2. Boot by window.

1. At boot, read `windowRole()`, setup, and `window_front`. Show the window when `bootChoice` gives `"show"`.
2. When setup finishes, call `showWindow("panel")`. The panel goes to `panelOpeningPath`.
3. In `panel`, `onResolved` saves `panel-path`, not `lastPath`, and sets no window title.

D3. Route trees. Build the main tree or the panel tree of Contracts from `windowRole()`. Mount `PresentHost` in the main tree only.

D4. Hand-off. In the main tree, the four space-mode routes call `openInPanel(path)` in `beforeLoad` and redirect to `/spaces`. In the panel tree, listen for `panel-open` and navigate to the path.

D5. Keys. Add Command-1 and Command-2 to both windows, and the panel keys of the Keys table to the panel.

D6. Cross-window refresh.

1. After each mutation in `data.ts` invalidates its query keys, send `data-changed` with those keys.
2. In `main.tsx`, listen for `data-changed`. Invalidate the keys unless `isOwnEvent` is true.
3. Never put message or note text in the payload. The payload holds query keys only.

Tests (`node --test`): a pure function that gives the route tree name for each role, and the payload builder of `data-changed`, which holds query keys only.

### Phase 3: Verify and Document

#### E1. Manual QA

Run `make desktop-dev` and check each line. Write the result in the notes file.

1. First launch: setup shows in `main`. After setup, `main` hides and the panel shows. The Dock icon goes.
2. The main window sidebar holds Spaces, Voice, Eye tracker, Help, and Settings. It opens on Spaces.
3. A press on a space in the main window opens that space in the panel and brings the panel to the front.
4. New space in the main window opens the new space in Agent in the panel.
5. Talk in the panel: type, take a row, take a word, Speak. The September Microphone reaches a Zoom or FaceTime call.
6. Resize the panel from 400 points to the full screen. Make sure that the compact, regular, and wide tiers each appear and that no control is cut off.
7. Command-2 and Command-1 swap the windows. A draft in the panel stays.
8. Rename a space in the panel. The Spaces list in the main window shows the new name without a reload.
9. Present from a note in the panel. The main window shows the overlay over the full screen.
10. Close the panel with the red button. Control-Option-Space shows it again with the draft.
11. Open a full-screen app. The panel floats above it.
12. Quit and launch. Both windows come back at their sizes and positions, and the window that was in front shows.
13. VoiceOver reaches every control of the panel header, the sheets, and the mood menu.

#### E2. Documentation

1. `apps/desktop/README.md`: the two windows, the keys, the two route trees, the hand-off routes, and the data refresh between windows. Remove the sections that describe Talk, Notes, and Agent in the main window and the dock.
2. `apps/desktop/src-tauri/README.md`: the window commands, the tray, the global key, and `native/window.m`.
3. `packages/app-ui/README.md`: `ChromeContext`, `PanelShell`, `PresentHost`, and the width tiers.
4. `docs/concepts/space-navigation.md` and `docs/concepts/note-present-export.md`: the panel and Present from the panel.
5. New concept doc `docs/concepts/desktop-floating-panel.md` with `package: app-ui, desktop`.
6. `DESIGN.md` Decisions Log: one row for the panel and the new main window, which supersedes the 2026-08-21 desktop layout row for Talk, Notes, and Agent.
7. Update the "Main Window" table of the mock to match the task table in Scope.
8. Keep `docs/notes/2026-10-05-floating-panel.md` during the work, as the root `CLAUDE.md` requires.

## Checks Before Each Commit

From `apps/desktop/`: `pnpm build`, `pnpm test`.
From `apps/desktop/src-tauri/`: `cargo test`, `cargo clippy --all-targets --all-features -- -D warnings`, `cargo fmt --all -- --check`.
From the root: `pnpm --filter core --filter web --filter desktop test`, and the web build, because Tasks C1 to C4 change shared screens.

## Orchestration

The lead agent runs the phases in order and does not write code.

1. Start A, B, and C as three subagents in one message. C can split into C1 and C2, then C3 and C4, if one agent is too slow. A4 runs after A1 in the same agent.
2. When the three agents report, run all the checks in "Checks Before Each Commit". If a check fails, send the failure to the agent that owns the file.
3. Start D. When D reports, run the checks again.
4. Run E1 with the user, because it needs a real call and VoiceOver. Then start E2.

Each subagent prompt holds: the task text from this plan, the Contracts section, the files that it owns, and this rule: "Change no file outside your list. If you need a change outside your list, stop and report it."

## Open Questions

- The mood menu also changes the web app below 560 pixels. If the web app keeps the five keys, C2 needs a chrome check in addition to the container query.
- `DashboardScreen` stays in `packages/app-ui` for the web app. The desktop app no longer uses it.
