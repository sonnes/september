# September Application UI

This package holds the layouts, blocks, screens, and services that the browser
app and the desktop app both render. It imports controls from `@september/ui`
and pure rules from `@september/core`. It never imports an app from `apps/*`.

Pages import blocks, and blocks import services. A block never imports a page
or a layout.

## The Platform

`platform.ts` holds the `Platform` interface. It holds only the work that is
different in the browser and on the Mac:

| Member         | What it does                                                                         |
| -------------- | ------------------------------------------------------------------------------------ |
| `app`          | The source and the version that a backup records.                                    |
| `store`        | The rows and the settings. Every write rejects when it fails.                        |
| `voice`        | The system voice, the cloud voice stream, stop, and a sound file of a sentence.      |
| `providers`    | The status, the keys, the OpenRouter sign-in, the voices, the quota, and the clones. |
| `writing`      | The endpoint and the key of OpenRouter, and of Apple Intelligence where it runs.     |
| `device`       | The identity, the browser, the close guard, and the sound outputs.                   |
| `capabilities` | The flags `dashboard`, `eyeTracker`, and `floatingPanel`.                            |

An optional member is a capability. A platform that cannot do the work has no
such member. The optional members are `writing.apple`, `device.fullScreen`,
`device.virtualMicrophone`, and `device.renderVideo`.

Each app exports one `platform` from its `src/platform.ts`. Shared code imports
it from `@platform/adapter`:

```ts
import { platform } from "@platform/adapter";
```

Each app maps `@platform/adapter` to its own `src/platform.ts` in TypeScript
and Vite. `adapter.d.ts` declares the module for the type check of this
package.

## Services

`services/` holds the work that both apps share, written once over the
platform:

| Module           | What it holds                                                                       |
| ---------------- | ----------------------------------------------------------------------------------- |
| `settings.ts`    | The held settings, `loadSettings`, the setup, and the owner of the rows.            |
| `talk.ts`        | The Talk draft and the mood of each space.                                          |
| `autosave.ts`    | `useAutosave`, the one save path of every field that saves as the person types.     |
| `speech.ts`      | The speech settings, `speak`, `stopSpeaking`, and the fallback to the system voice. |
| `sound.ts`       | The sound outputs and the virtual microphone.                                       |
| `data.ts`        | The query hooks of the spaces, messages, notes, phrases, and Agent rows, and `spacesQuery`. |
| `connections.ts` | The state of every service, the voices of the account, a new clone in that list, and forgetting a key. |
| `ai.ts`          | `generate` and the Agent writer, through `@earendil-works/pi-ai`.                   |
| `agent.ts`       | `askAgent` and `resolveAgentProposal`.                                              |
| `suggest.ts`     | The local word completion, and the suggestions of AI Assistance.                    |
| `phrase-sync.ts` | The phrases that AI Assistance writes for a space.                                  |
| `usage.ts`       | The usage records and the usage report.                                             |
| `backup.ts`      | The download and the restore of a backup.                                           |
| `export.ts`      | A note saved as text, audio, or video.                                              |
| `cloning.ts`     | The recorder and the clone of a voice.                                              |
| `player.ts`      | The preview player of a voice.                                                      |
| `browser.ts`     | `downloadBlob` saves a file as a download. `warnBeforeUnload` guards a close.       |

Each app awaits `loadSettings` once before the first render. It reads every
held setting and the identity of the device. After that, a screen reads a
setting at once. A change goes to the store first. The held value changes only
after the write succeeds. `setting(key, from)` gives one held setting, and
`useSetting` gives its value to a screen. `keep` writes a setting for a screen
that does not wait, and logs a failed write.

Setup keeps the voice in the speech settings, not in the setup. A setup saved
before setup wrote the speech settings names its voice service, and
`loadSettings` moves that voice to the speech settings.

If the store holds no setup, the owner of the rows is the login name of the
system. If the system knows no login name, the owner is `local-user`. Setup
keeps the owner in the saved setup.

## Saving as the Person Types

The Talk draft, a note, the About text of a space, the sound of the voice in
the rail, and the Access and AI Assistance sections of Settings save on each
edit. There is no Save button. `useAutosave` does the save for
all of them:

- The screen shows each edit at once, and the saves run one at a time, in order.
- Only the newest save sets the state. An older save that ends late does not
  replace newer words.
- If a save fails, the screen shows an alert with Retry.
- While a save runs or after it fails, the app guards a normal close.

## Routes and the App Root

`routes.tsx` gives `createAppRoutes`, the route tree of both apps: setup,
Help, the pages, and the Settings sections. Each app gives what only it has:

| Option        | Web                               | Desktop                                              |
| ------------- | --------------------------------- | ---------------------------------------------------- |
| `shell`       | `AppShell` from `layouts/app.tsx` | `PanelShell` from `layouts/panel.tsx`, with `onHide` |
| `home`        | The landing page                  | A redirect to `openingPath`                          |
| `publicPages` | The legal pages                   | None                                                 |
| `pages`       | `/dashboard`                      | `/eyetracker`                                        |
| `sections`    | None                              | `/settings/panel`                                    |

The keys of `pages` and `sections` are paths of `APP_PAGES` and
`SETTINGS_SECTIONS`. They must be the paths that the capabilities of the
platform offer, or `createAppRoutes` throws. Setup runs once. Before setup is done, an app page goes
to `/welcome`. After setup is done, a setup step goes to the first page of
`APP_NAV`.

`navigation.ts` gives `APP_NAV` and `SETTINGS_NAV`. They are the lists of
`@september/core/rules/navigation` for the capabilities of the platform, with
a Lucide icon for each path. The icon records are typed by path, so a missing
icon stops the build.

`app.tsx` gives `App`, the root of both apps: `StrictMode`, the fonts, the
query cache, and the router. A failed read is not tried again, because both
stores are on the device.

## Checks

From the root of the repo, these commands check this package:

```sh
pnpm --filter @september/app-ui build
pnpm --filter @september/app-ui test
```

The tests are in `test/`. They render the real routes and blocks over one fake
platform, `test/platform.ts`, which holds the rows in memory. The web tests
use the same fake through `@september/app-ui/test/platform`. `test/render.tsx`
gives `renderApp`, `renderPart`, and the helpers that set up a space. `test/axe.ts`
runs the WCAG rules of axe that jsdom can run.

## Shells and Focus

The browser app uses `AppShell`, and the desktop panel uses `PanelShell`. Both
start with a skip link that moves the focus to `main`. After a move to another
screen, the focus goes to the `h1` of the new screen, or to `main` if the
screen has no `h1`. The focus stays where it is on the first screen, on a field
that the new screen focuses itself, and after the person presses a key or a
pointer.

A screen with no visible `h1` gives `ScreenHeader` a `heading`. The header
then holds an `h1` that only a screen reader reads. Talk, Notes, and Agent do
this.

The app shell puts the pages of `APP_NAV` in a `nav` named Main. Each row is a
48px key. The open page has `aria-current="page"`. The sidebar starts
collapsed at every window width. A manual toggle stays in effect across window
resizes.

Escape closes the thing that opened last first. A sheet, a dialog, the
writing tools of a note, the Talk message pages, and Present each close on
Escape before the screen behind them. Every Escape step goes through
`useEscape` in `blocks/keymap.tsx`, and a field that leaves on Escape, such as
the note title or the code of a phrase, adds its own step while it is open.

## Access

Every shell and the setup layout apply the access profile of the person. The
profile sets the theme, the input method, the motion, the contrast, and the
reach of every key. See `docs/concepts/access-profile.md`.

The input layer answers each press with a check and a click. For Eyes, it
presses a key after a dwell. For Switch, it scans the screen. The scan steps
through the elements marked `data-scan-group`, then through their keys.
`data-housing` marks an indigo surface, where the scan band is an amber ring.

The input layer reads markers that `@september/ui` puts on its parts:

| Marker              | Meaning                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `data-modal`        | A dialog or a sheet. While one is open, the scan stays in it.     |
| `data-menu`         | A menu or a select list. While one is open, the scan stays in it. |
| `data-pointer-only` | A control that dwell and scan never press.                        |
| `data-access-skip`  | A control that dwell and scan never press, such as the skip link. |

Each shell shows a key that pauses the scan. While a sheet, a dialog, or a
menu is open, a second pause key shows at its end.

The How you choose step and Settings, Access ask the same questions. A new
input method applies only on Continue in setup, and only on its Use key in
Settings.

## Setup

Setup goes Welcome, How you choose, About you, Connect, Finish. The draft
stays in memory until Finish saves it. If a reload drops the draft, an
unreachable step goes back to Welcome.

From `md` (768px) up, the indigo panel of setup is a sidebar. Below `md`, it
is a bar across the top. The progress list is one `ol` in both shapes, so a
screen reader reads each step once. Each step that the person can open is a
link, named by the words that it shows. The current step is not a link, and
it has `aria-current="step"`.

Welcome shows a four-point summary of the Terms and Privacy. It opens the full
policies in the browser, and the setup answers stay. About you asks for a name
and a speaking style. The speaking style has Plain, Warm, Detailed, and
Custom. The instructions field shows only for Custom.

Connect picks working defaults for each job and offers the optional services.
With an ElevenLabs key, it lists the voices of the account. Hear it plays a
sample of the chosen voice. If a voice list, a sample, or a save fails, the
step shows an alert. OpenRouter connects through the sign-in of the platform,
and ElevenLabs takes an API key. The ElevenLabs area links to its Impact
Program.

A step is laid out for a 320px screen first. A part that does not fit at that
width moves under the words, and the main action takes the whole row.

## Help

Help shows the home, a search, the categories, and the task guides from
`@september/core/rules/help`. The home puts three common tasks before the
search and the category links. The window remembers the search and the scroll
position when the person comes back from a guide. A category link clears the
search and moves the focus to its heading. Clear search moves the focus back
to the search field.

A guide puts the written steps first. Each screenshot has a caption and an
Enlarge key. If an image fails, the written steps stay. A video needs both a
source and captions. Setup shows the setup guide in a sheet, so the setup
answers stay.

## Spaces and Modes

A space has three modes: Talk, Notes, and Agent. The space remembers the mode
that the person used last, keyed by the id of the space. Opening a space from
the Spaces list goes to that mode. The space switcher of the panel keeps the
open mode. A space mode saved by slug in an
older setting or backup moves to the id when the settings load.

New space makes the space on the press and opens it. It opens Agent when a
writing service is set, and Talk when none is. The space list and the dock
behave the same.

A space that has no description yet sets itself up in its Agent. The empty
transcript asks what the space is for. The first message becomes the
description, and the setup turn then names the space and writes its phrases.
When the turn renames the space, the screen follows the space by its id.

Rename and Delete show an error if the save fails. Delete asks first, in a
dialog with a red key.

## Talk

Talk restores the saved draft of the space before it shows the composer. Each
edit saves the draft. A word or a phrase put in from the rail or a suggestion
goes through the composer, so it saves and Undo can take it back.

Talk shows the newest messages that fit whole above the suggestions, up to 8.
The count changes only when a size or the messages change, so a row does not
move under a dwell. See all shows when older messages do not fit. See all
shows pages of 8 messages in place of the suggestions. Back to suggestions or
Escape closes the pages. A press on a message speaks it again.

While Speak plays a sentence, Talk shows a speaking card, and the field stays.
Stop or Escape stops the voice. Write next, or a typed letter, moves the focus
to the field while the voice goes on. While the browser system voice reads a
message, the word that it reads is indigo. See `docs/concepts/spoken-word.md`.

The composer has Undo, Delete, Clear, five mood keys, the sound output, and
Speak. Speak is the largest key. Below 560px of screen body, one mood menu key
replaces the five mood keys. The mood changes the suggestion prompt, and the
space keeps it. If the mood does not save, the mood goes back, and a line
under the field says so. Audio tags show
as chips. See `docs/concepts/audio-tags.md`.

The sound output key opens the outputs of September audio. It does not change
the sound output of the whole device. A green dot shows that the September
Microphone is on.

## Suggestions

Each suggestion row is a group named by its number, its source, and its words.
A mark at the start of a row shows its source: a past message, a phrase, an
opening, a typed code, or AI Assistance. In Talk and Notes, the pin of a
saved phrase is a key with `aria-pressed`. A press of the key keeps the phrase.
In Agent, the pin is only a mark. A row shows at most six words at a time. The insert key takes
the shown words and shows the next ones. The last slice offers Speak for the
whole suggestion.

The word row completes the word being typed from local words, on each letter.
It shows two lines at most. A word that the row clips is `inert`.

AI suggestions ask the writing service after an edit that ends in a space, a
new line, or `. , ! ? ; :`, then a pause of 200 ms. A restored draft waits for
an edit. A space change, a newer edit, or a change of the settings cancels the
open request. While a request is open, a Writing status shows. If the service
does not answer, a status line says so.

The access profile sets the number of rows, the words in a slice, the word
size, and the tile height.

## Notes

A note is Markdown. The editor shows the marks of a line only while the caret
is on it. A heading line has `role="heading"` and its level. The first typed
key opens the writing tools under the caret line. The tools hold the style
keys, Undo, Delete last word, Hide, and the suggestions. The suggestions read
the sentence before the caret, and a take replaces that sentence. Escape and
Hide close the tools, and Command-J or Control-J opens them.

The note list shows About first, then each note, with a search field from five
notes. From 52rem of screen body, the list is a column at the left. Below that
width, the list and the note take turns. The reading bar has Read aloud,
Present, Suggestions, and a More menu with Export and Delete note. Read aloud
reads the selection when there is one. See `docs/concepts/space-notes.md`.

## Agent

Agent is the conversation of one space with AI Assistance. Reads and changes
run without a stop. A delete stops for Approve and Reject, and then asks to
confirm. A turn that spends its whole write budget stops the same way.

Everything that the person must act on is a card, and everything else is a
line. A tool line is a folded `details` row. A proposal card shows what a
change replaces beside what it writes. The transcript has one live region. It
says `Working…` during a turn, then the newest reply. The words of an answer
that is still being written are `aria-hidden`.

## The Right Rail

Inside a space, the right rail keeps the phrases and the voice controls one
press away. Below 48rem, the two keys are in the screen header, and each opens
a sheet from the bottom. A phrase pressed in a sheet closes the sheet. The
sheet gives the focus back to its key when it closes.

A phrase goes into the active editor: the composer or the note document on the
screen. Each shell holds one active editor in `EditorProvider` from
`blocks/chrome.tsx`. The field registers with `useActiveEditor`, and the rail,
the panel sheets, and the panel keys read the same ref.

## Present

Present shows a note full screen, one chunk at a time, in the voice of the
person. Previous, Stop, and Next are keys at the reach size, in one scan
group. A key with nothing to do keeps its place and has `aria-disabled`. Tab
stays inside the stage. When it closes, the focus goes back to the key that
opened it. If the voice fails, Present pauses and keeps the chunk on the
screen.

On the desktop, the panel fills the screen while Present shows. See
`docs/concepts/note-present-export.md`.

## The Desktop Panel

`PanelShell` is the frame of the desktop floating panel. The desktop gives it
`onHide`, because the shared package cannot hide a window. On a space path,
the header shows the space button, the mode switch, and More. On any other
page, it shows Back, the title of the page, and More. Back goes to the last
space path that the panel showed, or to `/spaces`.

The panel has three width tiers:

| Tier    | Width           | Phrases and voice controls |
| ------- | --------------- | -------------------------- |
| Compact | Less than 560pt | A sheet                    |
| Regular | 560pt to 899pt  | A sheet                    |
| Wide    | 900pt and more  | The right rail             |

In the compact tier, the More sheet holds Clear, and the composer does not.

The panel keys:

| Keys           | Action                         |
| -------------- | ------------------------------ |
| ⌘K             | The space switcher             |
| ⌘⌥1, ⌘⌥2, ⌘⌥3  | Talk, Notes, Agent             |
| ⌘P             | Phrases                        |
| ⌘⇧V            | Voice controls                 |
| ⌘⇧O            | Sound output                   |
| ⌘⌫             | Clear the draft                |
| ⌘?             | Help                           |
| Control-0 to 5 | The moods, in the compact tier |
| Escape         | Stop, close, or hide           |

Escape first closes what opened last. After that, it stops the voice. If the
voice is not speaking, it closes the open sheet or menu. If nothing is open
and the draft is empty, it hides the panel.

In the wide tier, Phrases and Voice controls open the right rail on that tab.
The panel keeps the rail state in the `panel` setting. In the other tiers,
they open a sheet.

The space switcher has a search field, the spaces by last use, All spaces, and
New space. While its search is empty, the digits 1 to 9 open a row. Each row of
the More sheet is a 48pt key. A row with a shortcut shows its keys and has
`aria-keyshortcuts`.

## Settings

From 48rem, the Settings sections are a column. On a phone, they wrap. The open
section has `aria-current="page"`.

AI Assistance shows the provider first. Suggestions has a switch and a model
list. Agent and phrases has a Phrases switch, an Agent switch, and one model
list. Each switch saves at once. After a failed write, it keeps its saved
value.

A connection screen shows the steps to connect one service. Disconnect
forgets the key on the device. If that fails, the screen shows the error.

The Data screen downloads and restores a backup. It shows the date and the row
counts of the file, and asks a second time before it replaces data. A log of
each step stays on the screen, with no conversation text. An error stays until
the next attempt. After a restore, the app reloads. See
`docs/concepts/portable-backups.md`.

The usage report shows its periods as three keys. One arrow key moves to the
next period once.
