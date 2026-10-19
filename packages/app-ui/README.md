# September application UI

This package owns the layouts, blocks, and application screens rendered by
both the browser and Tauri apps. It imports generic controls from
`@september/ui` and pure behavior from `@september/core`.

The package must not import an app through `apps/*`. Platform work crosses the
compile-time `@platform/*` facade instead:

```ts
import { useSpaces } from "@platform/services/data";
import { speak } from "@platform/services/speech";
```

Each app maps `@platform/*` to its own `src/*` in TypeScript, Vite, and its test
runner. The browser implementation uses IndexedDB and browser APIs. Desktop
uses Tauri, SQLite, Keychain, and native media services.

Apps import screens through explicit subpaths:

```tsx
import { AppShell } from "@september/app-ui/layouts/app";
import { TalkScreen } from "@september/app-ui/pages/talk";
import { AgentScreen } from "@september/app-ui/pages/agent";
```

Keep copy neutral when the interaction is the same. Show a capability state
when only one platform can perform an action.

`pages/help.tsx` renders the shared Help home and task guides from the pure
catalog in `@september/core/rules/help`. `HelpScreen` owns route-level home and
guide rendering. `HelpGuideContent` renders the complete written guide on its
own, so onboarding can show setup guidance without navigating away or losing
the current setup answers.

The Help home places three common tasks before search and category links.
Search results preserve catalog order. The current app window remembers the
query and scroll position when a reader returns from a guide. Category links
clear search and focus the selected heading. Clear search returns focus to the
search field. The call shortcut identifies its Mac requirement.

Guides put written steps first. Screenshot details follow their assigned step,
and full-screen overviews sit in a disclosure. Each screenshot has a caption
and an Enlarge screenshot button. The dialog supports Escape and Close, then
returns focus without moving the guide. Capture widths prevent small images
from stretching. Failed images leave the written instructions available.
Videos require both a source and captions. Alternative tasks have separate
steps and outcomes, including provider connections and backup operations.

The shared app shell puts the pages of `APP_NAV` in a `nav` named Main. Each
row is a 48px key, in the rail and in the open sidebar. The open page has
`aria-current="page"` and a bar at the start of its row. The screen header has
a 48px Menu key with `aria-expanded`.

`AppShell` and `PanelShell` start with `SkipLink`, which moves the focus to the
`main` element (`MAIN_ID`). Both call `useRouteFocus` from `blocks/screen.tsx`.
After a move to another screen, the hook puts the focus on the `h1` of the new
screen, or on `main` if the screen has no `h1`. It leaves the focus alone on
the first screen, and on a field that the new screen focused itself.

A screen that has no `h1` of its own gives `ScreenHeader` a `heading`. Talk,
Notes, and Agent do this. The header then holds an `h1` that only a screen
reader reads.

`blocks/access.tsx` holds the access layer. `AppShell`, `PanelShell`, and the
setup layout mount `ApplyAccess` and `InputLayer`. `ApplyAccess` puts the
access profile on the root element: the dark theme, the input method, the
motion, the contrast, and the reach tokens. `InputLayer` answers each press
with a check and a click, presses a key after a dwell for Eyes, and scans the
screen for Switch. Each shell also places `ScanPauseKey`, the key that pauses
the scan: the foot of the sidebar, the panel header, or the setup sidebar.
While a sheet, a dialog, or a menu is open, `InputLayer` puts a second pause
key at the end of it. The
scan steps through the elements marked `data-scan-group`, then through their
keys. `data-housing` marks an indigo surface, where the scan band is an amber
ring with no fill. `AccessForm` asks the questions of the profile in the How
you choose step and in Settings, Access. A new input method applies only on
Continue in setup and on its Use key in Settings. `useAccess` and `useReach`
give the profile and its reach to a screen. See
`docs/concepts/access-profile.md`.

`layouts/onboarding.tsx` owns the setup shell. Its indigo panel is the sidebar
from `md` (768px) up and a bar across the top below it — the same width at
which `layouts/app.tsx` turns its sidebar into a sheet. The bar keeps the brand
mark, the numbered steps, and Help; the pitch and the step labels wait for a
screen wide enough. The progress list is one `<ol>` in both shapes, so no step
is announced twice. Each step link is named by the words that it shows. Below
`md`, only a screen reader reads the label. The current step has
`aria-current="step"`.

`layouts/app.tsx` draws each platform's `APP_NAV` destinations. Every path has
a matching Lucide icon in the layout, including desktop-only destinations.

`pages/settings.tsx` owns the shared Data screen at `/settings/data`. It calls
`@platform/services/backup` to download or restore a backup. The screen parses
the file with `@september/core`, shows its date and row counts, and asks for a
second confirmation before it replaces data.

The Data screen shows an accessible activity log for file reading, validation,
download preparation, and restore. Errors remain visible until the next attempt.
The log stays in memory and contains no conversation text. A successful restore
reloads the app and clears the log.

The same file owns the writing-model controls. AI Assistance shows the
provider first. The Suggestions section has a switch and a model list. The
Agent and phrases section has a Phrases switch, an Agent switch, and one model
list. The key screens hold no model list.

Each switch saves immediately and keeps its saved value after a failed write.
Speaking style offers Plain, Warm, Detailed, and Custom. The instructions field
shows only for Custom. Generation hooks subscribe to successful setup changes.

Automatic AI suggestions require an edit that ends in whitespace or
`. , ! ? ; :`, followed by a 200 ms pause. Restored drafts wait for an edit.
Space changes, newer edits, and relevant settings changes cancel pending requests.
Late responses cannot replace current results. Local word completion still
responds to each letter.

`pages/agent.tsx` owns the Agent conversation for one space, and the screen
that makes a space. It shows the separately stored transcript and runs
reads and changes without interruption. Only a delete stops for an Approve and
Reject action, and it adds a destructive confirmation on top of that. A turn
that spends its whole write budget stops the same way, so the card still draws
any pending write — an unpin among them, explaining that generation can
replace the phrase later. Agent prompts use the shared
composer with an Ask action and no speech-oriented suggestion stripe, and it
carries the same right rail as Talk and Notes.

A space has no screen of its own before it exists. `useNewSpace` in
`blocks/space.tsx` makes one on the press and opens it — Agent when a writing
service is configured, Talk when none is — and the space list and the dock both
call it, so the two presses behave the same.

A space that nobody has described yet is set up inside its own Agent.
`spaceNeedsSetup` turns that screen into the question: the empty transcript
asks what the space is for, and the composer keeps its suggestion stripe,
because writing a description is the most free typing the app asks for. The
first thing said becomes the space's description and then runs as the
introduction turn. The model never decides whether to create.

`useSpaceBySlug` resolves the space each screen shows. That first turn renames
the space, which moves its address, so the hook follows the rename by id and
only leaves for the list when the space is really gone.

`blocks/agent-transcript.tsx` draws the transcript on one rule: anything the
user must act on is a card, and everything else is a line. `ToolLine` is a
44px `details` row folded by default, so the reads behind an answer stay a
footnote to it. `ProposalCard` is the only card, and it shows what a write
would replace beside what it would write. `Openers` is the pressable row that
both this screen and the Agent empty state use, because an example you can
press costs no keystrokes and one you must retype costs all of them.

`Transcript` takes a `partial`: the words of an answer still being written. It
draws them where `Working…` would go, and the stored row replaces them when the
turn ends. Those words are `aria-hidden`, because reading an answer a word at a
time would talk over a user for as long as the model keeps writing. The
transcript has one live region. It says `Working…` during a turn, then the
newest reply. A pending change has a red Reject key, and a warning in a card is
zinc with a warning icon.

`pages/steps.tsx` lays a step out for 320px first. Anything that would overflow
that width carries a breakpoint prefix, so a service status drops under the
name rather than squeezing the description, the panel under a service starts at
the edge of its card, and the primary action takes the whole row. Keep new
setup work to the same rule.

`blocks/pick-list.tsx` holds `PickList` and `ChoiceKey`. A `PickList` is a
radio group with a name. Each row is a `ChoiceKey`: a key of 48px or more with
a check on the chosen row. Only the chosen row takes a Tab stop, and the arrow
keys move the choice. Who speaks and the source of voice samples use
`ChoiceKey` too.

A `PickList` is a container. It uses two columns only when its own width is
32rem or more, not the width of the window. A long name wraps, and it is never
cut off.

`layouts/settings.tsx` shows the Settings sections as a column from 48rem. On a
phone the sections wrap onto more lines, so every section and the open one
show. A row of Services, and a provider row of AI Assistance, moves its badge
and its key under the words when the row is narrow.

`blocks/space-panel.tsx` draws the right rail and the card beside it. The tabs
come from `@september/core/rules/panel`. Each rail key shows its label under
its icon, and the label is its name. The rail keeps phrases and speech
settings one press away on every screen inside a space — Talk, Notes, and
Agent. Agent is where the phrases are written, so it is where seeing them
matters most. Below 48rem, the two keys sit at the end of the screen header,
through `HeaderActions`. A key opens its tab as a sheet from the bottom, and
the sheet gives the focus back to the key when it closes. A phrase pressed in
the sheet closes the sheet, because the sheet covers the composer.

`blocks/space.tsx` owns the Talk, Notes, and Agent mode dock. It also keeps the
Talk audio selector beside Speak. The selector names September audio because
each platform service routes September playback; it does not promise to change
the device's system-wide sound output.

`blocks/present.tsx` is the one full-screen surface here. It draws over the
whole viewport instead of inside the shell, because a presentation is for the
room and not for the person holding the keyboard. It stays a block and not a
route, so no app has to change its route set to present a note.

Below the words of Present, Previous, Stop, and Next are keys at the reach size,
in one scan group. A key that has nothing to do keeps its place, has
`aria-disabled`, and shows a dotted line. The thirds of the stage still move
the story for a hand, but they are not keys, so a gaze that reads the words
presses nothing.

The stage keeps Tab and Shift-Tab inside it. When it closes, the focus goes
back to the key that opened it.

`PresentOverlay` calls `fullScreen(true)` from `@platform/services/os` when it
opens, and `fullScreen(false)` when it closes. In the desktop app, the panel
fills the screen while the overlay shows, then goes back to its size. The web
version of `fullScreen` does nothing.

`blocks/chrome.tsx` exports `ChromeContext`, with the value `"shell"` or
`"panel"`. The default is `"shell"`, and the web app always uses it. In
`"panel"`, `SpaceDock` renders nothing, and `ScreenHeader` renders only its
`heading`. A page reads the value through
`useChrome()`, so Talk, Notes, and Agent have one implementation for both
frames. The same file holds `PanelContext`, `usePanel()`, and `tierFor`.

`layouts/panel.tsx` holds `PanelShell`, the frame of the desktop floating
panel. The desktop app has one window, and every route after setup renders in
`PanelShell`. It renders `ChromeContext` `"panel"`, `PanelHeader`, and an
`<Outlet/>`. With no spaces, a space-mode path shows `No spaces yet` with New
space. The other pages show as usual.

The desktop bootstrap gives `PanelShell` one prop, `onHide`, because the shared
package cannot hide a window. Escape calls it when there is nothing to stop or
close.

`PanelShell` binds the panel keys: Command-K, Command-Option-1 to 3, Escape,
Command-? for `/help`, the keys of the More sheet, and Control-0 to Control-5 in the
compact tier.
`escapeStep` and `moodForKey` in `@september/core/rules/panel` hold the rules.
Escape stops the voice first. Else it closes the open sheet or menu. Else, with
an empty draft, it hides the panel. A draft of only spaces counts as empty.
`PanelRail` handles its Escape in the capture phase, so one press does not also
hide the panel.

`blocks/panel-header.tsx` holds `PanelHeader` and `PanelSheets`. The header
uses the indigo sidebar tokens. Its content depends on the path:

| Path              | Left         | Middle                                       | Right |
| ----------------- | ------------ | -------------------------------------------- | ----- |
| A space-mode path | Space button | The Talk, Notes, and Agent switch            | More  |
| Any other page    | Back         | The title of the `APP_NAV` page of the path  | More  |

`PanelShell` gives the header a `PanelPage` on a page that is not a space. For
example, `/settings/writing` shows the title Settings. Back goes to the last
space-mode path that the panel showed. If no such path exists, Back goes to
`/spaces`.

The space button opens the space switcher: a search field, the spaces by last
use, All spaces, and New space. All spaces opens `/spaces`. While the switcher
is open and its search is empty, the digits 1 to 9 open a row.

The mode switch is a `nav` named Space mode, and the open mode has
`aria-current="page"`. More opens the More sheet below the header. Each row of
the sheet is a 48-point key. A row with a shortcut shows its keys and has
`aria-keyshortcuts`.

On a space-mode path, the More sheet holds Phrases, Voice controls, Rename
space, and Delete space. Sound output shows when the composer speaks. Clear the
draft shows in the compact tier only. Below these rows, the sheet lists each
page of `@platform/rules/app-nav` `APP_NAV` with its title. Phrases, Voice
controls, and Rename space open as sheets below the header. The Voice controls
sheet has this name so that it is different from the Voice page.
Delete space uses `DeleteSpaceDialog` from `pages/spaces.tsx`. After a delete,
the panel goes to `/`. The composer puts a `ComposerHandle` in `PanelContext`,
so the header can read the draft, clear it, add a phrase, and set the mood.

The panel has three width tiers. `tierFor` gives the tier for a width:

| Tier    | Width                | Right rail | Phrases and Voice |
| ------- | -------------------- | ---------- | ----------------- |
| Compact | Less than 560 points | No slot    | A sheet           |
| Regular | 560 to 899 points    | No slot    | A sheet           |
| Wide    | 900 points and more  | The slot   | The right rail    |

`PanelShell` measures its own width with a `ResizeObserver`. That tier decides
the slot of the right rail, Clear in the More sheet, and the Control mood keys.
Without a slot, `RightPanel` renders nothing.

In the panel, the composer reads the tier from `usePanel()`. The composer and
the More sheet then use the same width, so Clear is always in one of the two.
In the compact tier, one mood menu key replaces the five mood keys, and Clear
leaves the composer row.

The audio selector is one 44-point headphones key beside Speak, at every width.
The name of the output is in its menu and in its accessible name. A green dot on
the key shows that the September Microphone is on.

The web app has no panel. There, the composer reads the width of the screen
body. Each page marks its screen body with `@container`. The breakpoint is
`@min-[35rem]` (560 pixels), because Tailwind has no named container size at
560. Below that width, the composer folds in the same way, but Clear stays.

Talk shows the newest messages that fit whole in the space over the
suggestions, up to 8. A copy of the rows that nobody sees or reaches gives
their heights, and `recentThatFit` counts the rows that fit. The count changes
only when a size or the messages change, so a row does not move under a dwell.
See all shows when older messages do not fit. When not even the newest row
fits, only the label row shows, and its key says "See all (N)".

The parts of `Composer` are items of the screen column, through `contents`.
The column of Talk and Agent gives way in this order. First the history drops
rows down to its label. Then the stripes shrink and scroll, down to 96px. Last,
the column itself scrolls. The field, its keys, and the dock are never under
other content. Each row shows the time of the message, and a press on the row speaks it
again. The name of a row is "Speak again:" and the words of the message. The
newest row is larger. A status region on the page says "Speaking:" and the
sentence that Speak plays. See all shows the pages of 8 messages in place of the suggestions. Back
to suggestions or Escape closes the pages.

The suggestion rows have no card. The mark at the start of a row shows its
source, in the color of its tiles: a teal clock for a past message, an indigo
pin for a phrase, indigo arrows for an opening, the code for a typed code, and
a gray sparkle for AI Assistance. Every mark has the same 44px gutter, and the
pin fills it as a key with `aria-pressed`. While a request to AI Assistance is
open, a "Writing" status shows beside the Suggestions label. The word row
shows two lines at most. A word that the row clips is `inert`, so the focus
never lands on it.

Each row is a group named "Stripe 1 of 3", its source, and its words. A tile
is named by its word and by the words a press takes, for example "cold. Takes:
Please bring me some cold". The end key is named by its verb and the words of
the row, for example "Insert: …" or "Speak: …". The tiles of a row scroll, the
end of a long row fades, and the end key stays outside the scroll. Only the
padding of a tile shrinks to fit a row: the word and the height stay at full
size.

While Speak plays a sentence, Talk shows the speaking card below the messages,
and the field stays. Stop, or Escape, stops the voice. Write next, or a typed
letter, moves the focus to the field while the voice goes on. `Composer` takes
a `fieldRef`, so a screen can move the focus to the field. The composer ring is
indigo, and it is full strength while the composer has the focus. Under
the composer, a line shows the keys that work now. A touch screen does not show
this line.

Undo, Delete, and Clear show their labels, and each name starts with the
label. They are 48 points high in every tier, in both apps. A gap and a line
come before Speak, and Speak is the largest key. The mood in use shows its
name beside its emoji.

Talk restores its device-local draft before mounting the composer. It saves
each edit through the platform settings service and never clears newer words
when an earlier message finishes saving. Notes save text and titles on input,
keep pending edits visible during query refreshes, and offer retry on failure.
Both screens guard normal closing while writes are pending or failed.

`blocks/note-document.tsx` holds `NoteDocument`, the editor of Notes and the
About tab. It keeps the text as Markdown lines. The line rules are in
`@september/core/rules/note-document`. Each line is a `div` with a `data-kind`,
and the marks of a line show only while the caret is on it. The styles are in
`packages/ui/theme.css`, under `.note-document`. The first typed key opens the
writing tools under the caret line. The tools hold the style keys, Undo,
Delete last word, and Esc in one row, then `Suggestions`. A heading line has
`role="heading"` and its level. The marks of the other lines leave the eye but
stay in the text, so a screen reader still says what a line is. The stripes read the
sentence before the caret, and a take replaces that sentence. `Suggestions`
gets the full note around the caret as `document` for the writing service, the
other lines of the note as `history`, and a `finishLabel` for the end key. Escape and Hide close the tools, and
⌘J opens them. A handle gives the screen `insert`, `selection`, `text`, and
`openTools`.

`pages/notes.tsx` puts `NoteList` beside the page and `NoteReadingBar` at its
foot. From 52rem of the screen body, the list is a column at the left. Below
it, the list and the note take turns through `data-pane`, and the note has an
All notes back key. The list shows About first, then each note with
`notePreview` and `messageTime`, and a search field from five notes. The bar has Read aloud, Present, Suggestions, and a More menu with Export
and Delete note. Read aloud reads the selection when there is one. The bar
hides while the writing tools are open.

`blocks/suggestions.tsx` shows suggestions in slices of at most six words.
A row that contains the draft after its opening underlines the typed words.
The insert action accepts an unfinished slice and reveals the next words.
The final slice offers Speak for the complete suggestion. Starters retain
their insert action. Selected suggestions remain available across model
responses and after phrase-code expansion.

The Talk composer has five mood keys left of the audio output. Below 560 pixels
of screen body, one mood menu key replaces them. The mood
changes the suggestion prompt. Suggestion rows, the word row, messages, and
phrase rows show audio tags as chips, and a layer behind the composer field
draws a chip under each tag. See `docs/concepts/audio-tags.md`.

Speech returns whether playback completed successfully. Talk and Read aloud
show speech notices. Present pauses on failure and keeps the unread chunk on
screen for retry or silent use.

`SpokenText` in `blocks/suggestions.tsx` draws a message of Talk. While the
browser system voice reads it, the word that the voice reads is indigo. See
`docs/concepts/spoken-word.md`. The stripes take the number of stripes, the
words in a slice, the word size, the tile height, and the gap from the access
profile. `TimeRangeSelect` in `blocks/usage.tsx` shows the periods of a report
as three `ChoiceKey` keys, not a dropdown.

`ChooseStep` in `pages/steps.tsx` is How you choose, the step after Welcome.
`AccessSettings` in `pages/settings.tsx` is Settings, Access.

`WelcomeStep` in `pages/steps.tsx` includes a four-point Terms and Privacy summary
in both apps. It opens the full policies through the platform browser
service, preserving the in-memory setup answers. It adds no consent flag.

About you asks for a name and speaking style during setup. AI Assistance
edits the speaking style; neither screen includes a Personal words field.

Setup follows Welcome → About you → Connect → Finish in both apps. It no
longer asks for a setup mode; Connect keeps working defaults and optional
provider connections. Existing saved mode values remain compatible.

The OpenRouter connection control in `blocks/services.tsx` starts platform
OAuth, shows pending or failed authorization, and cancels when the screen
closes. ElevenLabs retains its API-key field.

The ElevenLabs connection area links to its Impact Program in setup and
Settings, whether or not a key is already connected. The link opens in the browser.

The application sidebar starts collapsed at every window width. Manual toggles
remain in effect across window resizes while the app shell stays mounted.
