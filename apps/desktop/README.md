# September Desktop

September Desktop is the Tauri edition of September, sized for the 13-inch iPad
landscape window. It renders the workspace's shared application UI and supplies
macOS services through Tauri. The Rust backend also provides local text
generation through a bundled apfel sidecar on supported Macs.

The UI uses Tailwind CSS v4, shadcn/ui primitives, and TanStack Router.

## Where the UI code is

The root workspace owns the application UI. This app owns the route bootstrap
and the services that connect that UI to macOS.

| Directory                  | Holds                                                                                                                | Rule                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `packages/app-ui/layouts/` | `onboarding.tsx`, `app.tsx`, `settings.tsx`                                                                          | The component renders an `<Outlet/>`.                |
| `packages/app-ui/pages/`   | Route screens: `steps` `dashboard` `spaces` `talk` `agent` `notes` `voice` `settings` `usage`                        | A `createRoute` call in `src/main.tsx` names it.     |
| `packages/app-ui/blocks/`  | `screen` `space` `services` `space-panel` `phrase-panel` `speech-settings` `pick-list` `suggestions` `usage` `brand` | Two or more pages or layouts use it.                 |
| `src/services/`            | `os` `data` `backup` `ai` `agent` `speech` `cloning` `player` `phrase-sync` `suggest` `usage`                        | It speaks to Rust, the platform, or a cloud service. |
| `packages/core/`           | autocomplete and platform-independent rules                                                                          | Both web and desktop import the same implementation. |
| `packages/ui/`             | Tailwind theme and shadcn primitives                                                                                 | A token or primitive has one source.                 |
| `src/rules/`               | `app-nav` `settings-nav` `onboarding` and core compatibility exports                                                 | Platform route rules stay local.                     |

Shared UI imports `@platform/*`; the desktop build maps that alias to `src/`.
This keeps SQLite, Keychain, speech, and native-media calls outside the shared
screen package.

## Move through the app

The root route holds an outlet only. Below it are two layouts, so a setup step
never wears the app sidebar, and an app screen never wears the setup sidebar.

| Layout      | Component                                                    | Routes                                                                                                                                                                                                                                                                          |
| ----------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup       | `OnboardingLayout`, `packages/app-ui/layouts/onboarding.tsx` | `/welcome` `/profile` `/mode` `/connect` `/finish`                                                                                                                                                                                                                              |
| Application | `AppShell`, `packages/app-ui/layouts/app.tsx`                | `/dashboard` `/spaces` `/spaces/$slug/talk` `/spaces/$slug/agent` `/spaces/$slug/notes` `/spaces/$slug/notes/$noteSlug` `/voice` `/voice/clone` `/help` `/help/$guideSlug` `/settings` `/settings/writing` `/settings/usage` `/settings/data` `/settings/connections/$provider` |

`AppShell` is the shadcn `Sidebar` and `SidebarInset` pair: a solid indigo
sidebar beside a white inset card. `src/rules/app-nav.ts` lists the destinations
and their descriptions. `packages/app-ui/layouts/app.tsx` gives each path an
icon. Today, Spaces, Voice, Help, and Settings use the same screens as the
browser app.

Help uses the shared task catalog at `/help` and one stable guide slug at
`/help/$guideSlug`. Both Help routes use `AppShell` but stay outside the
finished-setup guard. The setup sidebar can open the setup guide inline without
leaving the current step or changing its answers. An unknown guide slug returns
to `/help`.

The window opens at the 1376px baseline, so the sidebar starts as a 48px icon
rail. A wider screen opens the full sidebar. Command-B toggles it, and that
choice holds until the width crosses the baseline again.

Setup runs one time. The last step keeps its answers in the `setup` setting,
then opens `/dashboard`. After that, `/` opens the screen the user left, and
the setup flow does not show again.

The app comes back where it was. The router keeps each arrival in the
`lastPath` setting, and `/` reads it. `openingPath` in `src/rules/app-nav.ts` owns
the rule, and answers with a path from `APP_NAV` or a child of one. Everything
else opens `/dashboard`: a setup step must never come back, and an address that
names no screen is not a place to start. A space that the user erased opens the
space list, because the Talk screen sends a stale slug there.

The macOS app and its initial window are named `September`. After each route
settles, the window adds the page name, such as `September — Talk`. The
`windowTitle` rule in `src/rules/app-nav.ts` names setup steps, nested space and
note screens, voice cloning, settings sections, and connection pages.

`isSetupDone` in `src/rules/onboarding.ts` owns that rule: setup is done when it
holds a name and a mode. The app layout reads the same rule, so an app screen
opened before setup turns back to `/welcome`.

To run setup again, erase the `setup` setting.

## Talk in a space

A space keeps the words that the user says to one person or in one place.
`/spaces` lists them. `/spaces/$slug/talk` opens one. `/spaces/new` asks what
a new space is for.

The list shows the spaces, most recently used first. Each row gives the title
and the time of the last message. A search field keeps the rows whose title
holds the words that the user types.

The plus opens `/spaces/new`, and no space exists yet. The screen asks one
question: what is this space for? The words of the user become the note of the
space.

The screen is a Talk screen with no transcript. It writes through the same
`Composer` as every other mode, so the word tiles, the codes, the stripe,
undo, and delete-last-word are all here.

`NEW_SPACE_OPENERS` sits with the question, above Skip: a way in for a user who
does not know what to write, beside the way out for a user with nothing to say.
Three openers name the three kinds of space — a person, a place, a subject —
and each stops mid-sentence, so the stripe and the word tiles carry on from
there. A press starts the first sentence, and after that it starts the next
one. The row stays while the question does, so a press never unmounts the
button that was pressed.

No example on this screen names anyone. September does not know who the user
speaks to, and an example that guesses at a sister reads as though it did. This screen asks for the most free
typing in the app, and it must not be the one surface that charges full price
for it. With no space yet there is no context to write from, so the engine
reads `NEW_SPACE_CONTEXT` instead, and takes the words the user has said in
every other space for its history.

A model then reads those words. It writes the title, and it puts its own note
under the words of the user, after a blank line. The words of the user stay at
the top of the note, and nothing writes over them. `seedPhrases` reads the same
words and writes the first phrases.

The two model calls run together. The phrase writer does not need the note that
the title model produces — `decidePhraseSync` already treats a note with no
messages as enough to write from — so the user waits for the slower call and
not for the sum of the two. Each one writes its own fields with `space_patch`,
which merges per field, so neither undoes the other whichever lands first.

The screen waits for all three writes before it opens the space. A stripe that
filled a second after the screen appeared would move under the hand of a user
who was already reaching for it.

While they run, the three steps are drawn where the transcript would be, in a
`role="status"` region that is read out as each one changes. A label inside the
button that the press had just made unavailable named one thing at a time and
was never announced at all. A step that cannot run says why: with no writing
service the two model steps read as skipped, and the screen says so under the
console before the press as well.

Nothing on the screen is ever unavailable in a way that drops focus. A disabled
element cannot hold focus, so the browser moves it to the body, and a switch
user loses their place in the scan at the moment the app asks them to wait.
Every control of the console says `aria-disabled` instead, and its handler does
nothing.

Cancel stays live for the whole run. It gives up both model calls, and each
call is given up on its own after `MODEL_WAIT_MS`. The words reach SQLite
before any model answers, so a space that exists has lost nothing and simply
opens. A run that failed after the space was made patches that space on the
next press, and never makes a second one beside it; the error is shown, and
`Open the space anyway` is offered.

A user with nothing to say yet presses Skip. That space opens at once, with a
name that September made up, and it waits for no model.

The first space is `General`. A later space takes three words, such as
`Amber Cedar Meadow`. Three words read better in a tab than `New space 4`, and
they tell one space from another. The name must be free, because one slug must
name one space. `isAutoTitle` reads the words back out of the slug, so a model
knows that it may still rename such a space.

Every title goes through `freeTitle` first: the made-up name, the name the
model writes, and the name the user types in the header. Two spaces with one
title share one address, and that address then opens the wrong space. A model
title that is taken is dropped for the made-up name, because the user never
chose it. A rename that is taken is refused and said out loud, because the user
did.

A space made with Skip keeps that name. Talk asks no model, because
`/spaces/new` already asked. A Talk screen with no messages and no note offers
`Tell September what this space is for`, which opens the About tab — a skipped
space is the one that most needs it, and About is otherwise a long way to walk
for something the user was never told mattered. A space with a note but no
phrases yet gets them from `useSyncPhrases`.

The app never opens on `/spaces/new`: `openingPath` sends the user to the
dashboard instead. The words are not lost, though. They are kept in the
`new-space-draft` setting as they are written and offered back when the user
returns, because a paragraph typed by switch takes minutes and the rule of
every other writing surface holds here too. Cancel with words in the field asks
before it throws them away.

Delete asks first. Deleting a space deletes its messages too, so a dialog with
a red button holds the action.

The slug is the title of the space, and it holds no identifier. A stale slug
goes back to the list. A new title moves the address with it. Two spaces cannot
share a title, because one slug must name one space.

The Talk screen has three parts, from the top:

1. The transcript. It holds the spoken messages, 8 for each page, newest last.
   Press a message to speak it again.
2. The composer. It has the text field, undo, delete last word, clear, the
   audio selector, and Speak. The Enter key speaks. Shift and Enter make a new
   line.
3. The dock. It holds the spaces on the left and the mode switch on the right,
   with a wide gap between them, so a press meant for a mode cannot land on a
   space. When the space tabs no longer fit the row, they become one button
   that opens a list.

`packages/core/rules/spaces.ts` owns the rules that a test can read: the slug, the page, the
unique title, and the word that delete removes.

`src/services/data.ts` holds every read and every write of a space or a message. It uses
TanStack Query over the Rust commands. The owner of each row is the login name
of the operating system, which setup keeps in the `setup` setting.

The composer keeps its text until SQLite accepts the message, so a failed write
loses no words.

Three writers change a space, and each one knows only its own fields: the user
renames it, a model writes the name and the note, and the phrase sync counts
the messages. Each writer holds a copy of the row from the moment it started,
so a whole-row write puts back the fields it never meant to touch. `space_patch`
changes only the fields it is given, in one statement.

### Where the sound comes out

The audio selector beside Speak lists every output of this Mac. It moves both
voices to the output the user chooses without changing the macOS sound output.
September keeps the device UID in its SQLite settings. If that device is not
connected, September follows the current macOS output until it returns.

The selector also controls `September Microphone` for calling apps. It remains
visible on a Mac with one output so the microphone control stays available.

`src-tauri/src/audio.rs` reads the outputs from CoreAudio. The browser cannot
do this job: WKWebView holds `setSinkId`, but `navigator.mediaDevices` lists no
output device until the user grants the microphone, and September must not ask
for a microphone to name a speaker. Native system speech and cloud-voice files
both pass through a September-owned `AVAudioEngine`. Its output audio unit uses
the chosen device without writing the system default.

## Write a note

A space has three modes. Talk is for one sentence, said now. Notes is for long
text that the user writes over minutes or days, and hears back later. Agent is
a separate conversation that can read the space and propose changes.

`/spaces/$slug/notes` opens the note the user changed last.
`/spaces/$slug/notes/$noteSlug` opens one note by name. The mode switch in the
dock moves between all three, and a space tab keeps the mode the user is in.

September keeps the mode of each space, by slug, in the `space-modes` setting.
The space list opens each space the way the user left it. A new space starts
in Talk.

The screen has the same parts as Talk, from the top:

1. The title. A note with no title of its own shows `Untitled note`.
2. The note. A plain text field that holds markdown.
3. The console. The About tab, the note tabs, the word tiles, the field, undo,
   delete last word, clear, and **Add to note**.
4. The dock. The same one that Talk has.

`Composer` in `packages/app-ui/blocks/space.tsx` is that console, and both modes use it. A user who
cannot type reaches a sentence through the word tiles, the phrase codes, undo,
and delete last word. Notes needs every one of them as much as Talk does, so
there is one console, not two. Only the end differs: Talk speaks the sentence,
Notes puts it under the note after a blank line. Notes shows no sound output,
because it makes no sound.

The word engine reads the note in Notes mode, not the spoken messages, so the
words it offers follow what the user is writing.

The note starts saving text and title edits immediately. Pending or failed
saves keep the normal close guard active. There is no Save button, because a user who types
slowly must never lose words to a button they did not press.

The note has two writers: the field and the console. The field takes the new
text whenever it holds nothing unsaved, so words added from the console show
at once and are never written over.

The first save gives the note a name, from its first six words. A name the
user typed is never replaced. A new name makes a new slug, so the address
moves with it.

Read aloud speaks the note in the chosen voice. It removes the markup
first, so a voice says `Monday`, not `# Monday`. It writes no message, and the
transcript of the space does not change.

Delete asks first, in a dialog with a red button.

`packages/core/rules/notes.ts` owns the rules that a test can read: the name from the words,
the slug, and the text a voice says. `packages/app-ui/pages/notes.tsx` holds the screen.

`src/services/data.ts` reads and writes a note through `note_list`, `note_get`,
`note_put`, and `note_delete`. `note_put` writes one complete row, so
`useUpdateNote` reads the row first and changes only the fields it carries.
Deleting a space deletes its notes, in the same transaction as its messages.

The desktop note is a plain text field, not the rich editor of the web app.
Both apps keep markdown in the same `content` column, so the rows stay the
same.

### Present and export

The note header carries four actions: Read aloud, Present, Export, and Delete.

Present opens `packages/app-ui/blocks/present.tsx` over the whole window. The
note fills the screen one chunk at a time, in one of seven tones, spoken in the
chosen voice. When the sound stops the next chunk rises, which is the whole of
the timing: `speak()` resolves when playback ends. With no voice configured the
stage still runs, and the presenter advances by hand.

Thirds of the stage move back, hold, and on. The keys are `←` `→` `Space`
`Home` `End` `Esc`. The tone and the spoken or silent mode are kept in the
`present` setting.

Export saves the note as `.md` always, and as `.mp3` with an ElevenLabs voice.
`src/services/export.ts` writes both through the WebView download support, so
the file is made on the Mac and goes nowhere else. Audio reuses the speech file
that a voice-over already made.

Video is made in the browser app for now, and the row says so instead of
hiding: `ffmpeg.wasm` reaches its core through a blob URL, and the script
policy of this window allows `'self'` only.

`packages/core/rules/present.ts` owns the chunking, the tones, the font fit,
and the caption timing. See `docs/concepts/note-present-export.md`.

### The note of the space

The first tab of the console is About. It opens the note of the space, which
says who the user speaks to here and why. Every suggestion and every phrase of
the space reads it, so a change here changes the words that the app offers.

A model writes this note one time, on `/spaces/new`, from the words the user
gave there. `space_patch` keeps it in the `context` column. A note that the
user wrote is never replaced. A title that the user typed stays.

The About tab saves with no Save button. It saves when the field loses focus,
and again when the tab closes with words unsaved. The console writes here too,
so a user who cannot type fills this note with the word tiles. The console
writes only after the field blurs, so the two writers cannot race.

The tab is state, and not an address. The app cannot open on it, and a reload
returns to the last note. Give the tab an address when a user asks to link to
one.

### The right rail

A rail of icons stands at the right of both modes, in a card of its own beside
the screen. It holds two buttons: Phrases and Voice. A press opens a 320px
card. Phrases holds the phrases of the space and the shortcut ideas from
repeated messages. Voice holds the ElevenLabs model and the three sliders that
shape the sound.

The sound belongs beside the conversation. A voice that reads too fast is
heard while talking, and a user who must leave the space to mend it loses the
sentence they were writing.

The service and the list of voices are not in the card. A service is chosen
once, and an account holds a hundred voices, each one to be heard before it is
taken. Both stay on `/voice`, which has the room.

A press on the open tab closes the card. A press on the other tab moves the
card to it. Escape closes the card and leaves the rail. September keeps the
answer — the tab and whether the card was open — in the `panel-open` setting,
so the card comes back the way it was left. `src/services/os.ts` holds the same
answer while the app runs, because Talk and Notes each draw their own rail and
a mode switch must not undo a press. The setting held a plain `true` or `false`
while Phrases was the only tab, and `panelStateFrom` still reads that answer.

`packages/core/rules/panel.ts` holds the tabs and the rules of the saved state, where a
test reads them without a renderer. `packages/app-ui/blocks/space-panel.tsx` holds the
rail, `packages/app-ui/blocks/phrase-panel.tsx` the phrases card, and
`packages/app-ui/blocks/speech-settings.tsx` the voice card. `RightPanel` in
`packages/app-ui/blocks/screen.tsx` puts them beside the screen: the shell renders a slot as a
sibling of the inset, and the rail goes through it. A rail drawn inside the
screen would share the one white card of the inset, and the design gives the
rail a card of its own.

## Offer the next word

A person with ALS types slowly. Each word that the app offers is a word that
the user does not type. This is the first measure of the app.

`packages/core/autocomplete/` holds the engine. It is a copy of the engine in the web
app, so a correction in one app can move to the other one. It reads no file
and calls no service.

The engine blends three models of the words that come next:

| Layer | Weight | What it learns                                            |
| ----- | ------ | --------------------------------------------------------- |
| base  | 1.0    | The seed words in `packages/core/autocomplete/corpus.ts`. |
| user  | 2.0    | Every message that the user sends, in every space.        |
| space | 3.0    | The messages of the space that is open.                   |

The weight of a space starts at zero and grows over its first 500 words. A new
space with three messages must not speak over the other two layers.

Beside those three layers is a word list. `packages/core/autocomplete/dictionary.ts`
holds the 5,000 most frequent words of spoken English, in order of frequency.
The list goes to the prefix index only, never to the n-gram model, because a
flat list holds no real pairs of words.

The two kinds of material do different work. The sentences teach the model
which word comes after which. The list makes sure that a part-written word
always has candidates. The sentences alone cover less than half of the 300
commonest words in English, so `nur`, `bed`, and `sorr` gave nothing before the
list arrived.

Measured on 30 care requests that the engine never saw, the sentences alone
save 37.6% of keystrokes. With the list, they save 47.8%.
`tests/autocomplete-savings.test.mjs` holds a floor under both numbers.

Rebuild the list with `node scripts/build-dictionary.mjs`. The script writes
the same file to both apps. It removes slurs and strong obscenity, because a
wrong tap speaks the word aloud. This blocks the list, not the user: the user
layer still learns every word that the user writes.

`packages/core/autocomplete` holds the two rules that a test can read:

- `suggestionsFor(engine, text, spaceId)` gives the words to show. A space or a
  mark of punctuation at the end of the text asks for the next word. If the
  text stops in the middle of a word, it asks for the spellings of that word.
- `applySuggestion(text, word)` gives the text after the user takes a word. A
  word always ends with a space, which saves one more keystroke.

`src/services/suggest.ts` holds the engine and gives it the messages. A screen calls
`useSuggestions(spaceId, draft)`.

The engine learns again at each start. This costs about 6 ms for the seed words
and the word list. Keep a snapshot in SQLite only if a measurement shows that
the start became slow.

## Say more with fewer keys

Above the composer is a row of ready words for each suggestion. A press on a
word takes the sentence up to that word. This is the reason the app exists.

The rows come from four places. The order follows the composer.

With nothing typed, the stripe shows what the user keeps:

1. The saved phrases of the space.
2. The sentence starters of the space.
3. The writing service, which fills the rows that are left.

Once a sentence starts, the rows that follow the typed words come first:

1. The past messages of the space that start with those words.
2. The writing service.
3. The saved phrases and the starters that start with those words.

A short code at the caret goes above them all, in every state.

A one-word phrase draws as a chip, and not as a row. `stripePhrases` caps the
rows after it drops those phrases, so a one-word phrase never takes the place
of a row.

`packages/core/rules/stripes.ts` and `packages/core/rules/phrases.ts` hold the rules. Both are ports of
`apps/web/src/packages/{suggestions,spaces}/lib`. Change them in both apps, or
in neither.

A code is a short name for a phrase: `ty` gives "Thank you". Type it and the
phrase comes to the top of the rows. A code is 2 to 5 letters, it is never a
word the user might type, and it is never the same as another code. The app
makes a code with `generateCode`. A model never chooses one.

A phrase is pinned or not:

| Pinned | Where it comes from | What happens to it             |
| ------ | ------------------- | ------------------------------ |
| Yes    | The user kept it    | It stays. Nothing replaces it. |
| No     | A model wrote it    | The next writing replaces it.  |

A model writes the phrases when a space holds its first message or its note,
and again after six more messages. `seedPhrases` does it for a new space, before
the space opens. `useSyncPhrases` does it for a space that reaches Talk without
phrases. A model that writes nothing leaves the count alone, so the next message
tries again. `phrase_replace_ai` erases only the rows that are not pinned, in one
transaction, so a phrase the user relies on cannot be lost. The first space
starts with three pinned phrases, so the rows are never empty.

The right rail of a space opens the Phrases panel. It wears the layout of the
web app: one line for one phrase, the kept rows above the written ones, and a
form above them both that adds a phrase and its code. A press on a phrase puts
it in the composer. A code shows as a badge, and the badge opens a small field
that Enter keeps and Escape leaves.

Below the rows are shortcut ideas: words the user typed five or more times,
with a code ready. `mineShortcuts` counts them locally, with no model, so they
work in privacy mode. An idea the user turns down is kept in a setting and
never comes back.

One thing does not match the web app. Each control of a row is 44px, where the
web app uses 36px. `DESIGN.md` asks for 44px, and a user of September points
with less accuracy than a user of a browser.

Nearest the composer is the word row. It offers the next word, or the endings
of the word that the user started. The engine in `packages/core/autocomplete/` learns
from the messages of the user, so it needs no service and no wait.
`applySuggestion` knows a part-written word from a finished one, so the screen
never splits the text itself.

Each row reads differently. The colour and the mark in the gutter say the same
thing, so a user who does not read colour still knows what a row is:

| Row            | Colour and line | Mark                   | The key at the end |
| -------------- | --------------- | ---------------------- | ------------------ |
| A code         | Strong indigo   | The code               | Speak, solid       |
| A phrase       | Indigo          | A pin, solid when kept | Speak              |
| An opening     | Indigo, broken  | Two arrows             | Take the opening   |
| A past message | Teal            | A clock                | Speak              |
| From a model   | Grey            | none                   | Speak              |
| A word         | Warm            | none                   | none               |

A pin is solid when the user keeps the phrase, and it is an outline when a
model wrote it. The panel uses the same two shapes, so one phrase reads the
same in both places. `isKept` in `packages/core/rules/phrases.ts` answers the question,
because a stripe carries text only and not the row it came from.

The sizes come from `TILE` in `packages/core/rules/stripes.ts`, the same numbers the web app
uses. `tileScale` makes every tile smaller together, so the widest row stays on
one line. It counts the letters, the padding of each tile, and the line around
it, against the width that a `ResizeObserver` reports. The web app measures
each word with a layout engine instead. A row that is still too wide scrolls,
so no tile is ever out of reach.

A hover marks the tiles that a press would take, from the start of the row to
the tile under the pointer.

A user with no writing service still gets the phrases, the starters, the
codes, the rows from past messages, and the word row.

## Hear a voice

`src/services/speech.ts` gives every voice one interface. A screen calls `speak(text)`
and does not know which service answers.

| Voice        | How it speaks                                                    |
| ------------ | ---------------------------------------------------------------- |
| `system`     | The native process uses the macOS system voice. No file, no key. |
| `elevenlabs` | Rust makes a file. The native process plays the cached file.     |

Spoken messages now leave the native process. This path lets the Core Audio
process tap receive both voices. Voice-list previews still use `src/services/player.ts`
and do not enter a call.

A cloud voice that fails falls back to the voice of this Mac, and the composer
says so. A person who cannot speak must not meet silence.

A voice file is named for what makes its sound:

```
audio/<sha256 of the settings and the words>.mp3
```

The words lose the spaces at their ends, and each run of spaces becomes one
space. Case and punctuation stay, because both change how a voice reads a
sentence. The three numbers are written with three decimal places, so `0.5`
and `0.50` give one name.

The same words in the same voice therefore go to the service one time. A
changed voice, a changed number, or a changed word makes a new file. No rule
erases the old files yet.

A message keeps no path to a file. The name is the index, so a message spoken
with an old voice plays with the voice of today.

The Voice tab of the right rail holds the ElevenLabs model and three sliders
for speed, steadiness, and likeness. The `/voice` screen holds who speaks and
the voices of the account, with a **Try it** button beside the title. Each
change is kept at once, in the `speech` setting. **Try it** speaks one short
sentence, so the user hears a change before a real message. A voice sample
plays from a public address, so it needs no key.

Each writer changes its own fields, over the setting as it stands. The screen
writes `provider` or `voiceId`, and the card writes the model or a slider, so
a change made in one place is not written back over by the other.

The model is asked for twice, on purpose. It sits with the ElevenLabs key, at
`/settings/connections/elevenlabs`, because only a key lists the models. The
card of the rail repeats the question, because a message sounds like the model
as much as the voice, and the card is where the sound is judged. Both write the
same `speech` setting.

The `/voice` screen keeps the work that needs a whole screen: who speaks,
choosing a voice from the account, and cloning one.

### Clone a voice

**Clone your voice** opens the dedicated `/voice/clone` page. A user can
upload one or more audio files, record any of 10 guided samples with the
microphone, or combine both sources. Each file can be at most 25 MB. A name
and one sample are required. The encoded request can be at most 100 MB.

`src/services/cloning.ts` builds the ElevenLabs multipart form and sends its
bytes through raw Tauri IPC. Rust adds the cached ElevenLabs key and forwards
the form to the fixed `/v1/voices/add` endpoint. Audio does not become JSON or
base64, and the key never reaches the WebView.

After creation, the screen selects ElevenLabs and the new voice. It keeps the
current speech model and refreshes the account voice list. A stale provider
list cannot hide the new row while ElevenLabs updates the account. The form
keeps its fields and samples after an error, and clears them after success.
Success returns to `/voice`. Leaving the cloning page before success removes
the draft.

### Use the voice in FaceTime

The Talk audio selector can publish `September Microphone` as a macOS audio
input. The input exists only while September runs and the control is on.

1. Open Talk and open the audio selector beside **Speak**.
2. Turn on **September Microphone**.
3. Allow system audio capture when macOS asks.
4. Open FaceTime and select **September Microphone** from the Video menu.
5. Speak a message in September.
6. Turn off **September Microphone** when the call ends.

If callers hear nothing, allow September under System Settings, Privacy &
Security, Audio Recording. macOS publishes no way to read that answer, so a
refused microphone carries sound with no words in it and reports no error.

September removes the input when it quits. The next start also removes a stale
input that remained after an unexpected exit. This feature requires macOS 26
or later and does not install an audio driver.

## Release the desktop app

Set `APPLE_TEAM_ID`, `APPLE_SIGNING_IDENTITY`, and
`APPLE_PROVISIONING_PROFILE` for a signed build. Run `make desktop-release`
from the repository root to create the distribution DMG. The command loads the
Apple credentials from the ignored root `.envrc`, notarizes and staples the
DMG, checks it with Gatekeeper, and prints its SHA-256 checksum.

## Measure saved typing and service use

The Today screen shows two local signals. Efficiency compares the characters
in spoken messages with the keys pressed in the Talk composer. Service use
counts writing and speech requests in dollars, tokens, characters, and
ElevenLabs credits.

The period selector uses the local calendar day, Monday-to-Sunday week, or
calendar month. The Today screen starts on the current week. Settings > Usage
starts on the current month and adds service and feature breakdowns, recent
requests, the current ElevenLabs credits, and CSV download.

Talk counts printable keys, Backspace, and Enter. A phrase, suggestion, undo,
or clear action does not add a key. September records the count only after
SQLite accepts the message, so a failed message write creates no usage event.

AI events record the feature, provider, model, token counts, latency, result,
and what the call cost. Speech events record the voice service, model,
characters, estimated quota credits, cache status, latency, and result. Local
Apple and macOS calls are free. ElevenLabs uses prepaid quota credits. An
OpenRouter model whose published rates September holds records an estimated
cost from those rates and the tokens the call used; a model nobody prices
records none.

Usage events stay in `analytics_events` inside `september.sqlite3`. The app
deletes events older than 90 days at startup and whenever it reads or writes
usage. An event exactly 90 days old remains until it crosses the boundary.
Recording is best-effort and never stops speaking or writing.

`src/usage-summary.ts` holds the key-count, range, aggregation, and CSV rules.
`src/usage.ts` records and reads events through `call()` in `src/services/data.ts`.
`packages/app-ui/pages/dashboard.tsx` and `packages/app-ui/pages/usage.tsx` draw the two reports.

## Walk through setup

Each step is a route: `/welcome`, `/profile`, `/mode`, `/connect`, and
`/finish`.
Free setup skips `/connect`, so it shows four steps and advanced setup shows
five. `stepsFor` in `src/rules/onboarding.ts` owns that rule, and the sidebar, the
guards, and both navigation directions all read it. The router uses hash history,
because Tauri serves the built files from the asset protocol. A step opens only
after the answers it needs exist. The answers stay in memory until account
persistence is ported.

The brand, the setup title, and the step list are in a left indigo sidebar.
Each step opens as an inset white card beside it. All sections on a step stay
open. There are no collapsible groups.

Both sidebars show the same brand mark. `packages/app-ui/blocks/brand.tsx` reads it from
`public/logo.svg`, the file the brand publishes.

The name field starts with the name from the operating system. The user can
change it. In a browser the field starts empty, because the Tauri backend does
not exist there.

## Connect a service

The `/connect` step asks two questions: which service gives writing help, and
which service speaks. Each question starts with an answer that already works,
so a user on a supported Mac continues without an action.

| Job          | Choices                              |
| ------------ | ------------------------------------ |
| Writing help | Apple Intelligence, OpenRouter, none |
| Voice        | macOS system voice, ElevenLabs       |

An API key goes to the macOS Keychain, through Rust. The React code sends a key
one time and reads back a status. No key enters the draft, SQLite, an event, or
the browser storage. `src/services/os.ts` holds the only calls to Rust.

Rust reads both Keychain entries when the app starts and keeps the values in
memory. Provider commands use that cache. Connecting or forgetting a service
updates both the Keychain and the cache, so the change takes effect at once.

Writing help is the one job the WebView performs itself, with a typed model
client. It is never given a key. `writing_proxy` answers with the address of a
loopback proxy and a token that lasts one run; the proxy exchanges that token
for the real key and forwards the request. See
[desktop providers](../../docs/concepts/desktop-providers.md).

The voice list comes from `GET /v2/voices`, with `voice_type=non-default` and
`page_size=100`. The web app asks the same way. The filter leaves out the stock
ElevenLabs voices, so the list holds the voices of this account only. A page
gives 10 voices without `page_size`.

The order is the order of the web app: a cloned voice first, then a
professional voice, then a stock voice, then a similar voice. Rust sorts the
list, and the category never reaches the screen.

The ElevenLabs voice list carries a public sample for each voice. The preview
button plays that sample, so it needs no key and no speech call.

The screens read a voice and a model by `id`. ElevenLabs names them `voice_id`
and `model_id`, so Rust renames each one on the way in only. A two-way rename
gives the screen no `id`, and every row then looks selected.

## Change a setting

`/settings` holds the answers that setup collected. It is a layout with a
section list beside the open section, ported from the web app.

| Section      | Route               | Holds                                                   |
| ------------ | ------------------- | ------------------------------------------------------- |
| Setup        | `/settings`         | The state of each service, its key, and its model       |
| Writing help | `/settings/writing` | Who writes, and what the model knows about you          |
| Usage        | `/settings/usage`   | Typing saved, service use, quota, recent calls, and CSV |
| Data         | `/settings/data`    | A portable backup download and restore                  |

Listening still needs a transcription backend, and Account needs an account.
The service and the voices keep their own screen, `/voice`, in both apps. The
model and the sound moved to the rail of a space.

`src/rules/settings-nav.ts` holds the rules that a test can read: the sections, the
open section, and the guide for each cloud service. `packages/app-ui/layouts/settings.tsx`
holds the section list, and `packages/app-ui/pages/settings.tsx` holds the screens.

The Data section downloads the portable settings and every domain row as one
JSON file. It does not include Keychain keys, the selected audio output, cached
audio paths, or internal state. Version 2 includes the separate Agent
transcripts. Import also accepts version 1 with no Agent messages, validates
the complete file, previews its counts, and replaces the portable SQLite rows
in one transaction. A file from the browser app uses the same format.

Older setup values can have no owner ID. Export uses the current Mac login
name in the backup and keeps the stored setup value unchanged.

Older panel settings can name the retired Camera tab. Export and import change
this tab to Phrases. Other unsupported panel tabs remain invalid.

A press on **Set up** opens `/settings/connections/openrouter` or
`/settings/connections/elevenlabs`. The page gives the steps, takes the key,
and opens the address of the service in the browser of the Mac. The key goes
straight to the Keychain, through `src/services/os.ts`.

Each page also holds **Which model**. The model decides the quality,
the speed, and the languages. `provider_models` reads the list from ElevenLabs
and keeps the models that speak. The page shows the name of each one, and the
sentence that the service gives about it. Only the key lists the models, so the
choice appears after the key is stored. The new model goes into the `speech`
setting, beside the voice and the sliders.

Both lists are `PickList`, in `packages/app-ui/blocks/pick-list.tsx`. See
[One list picks one row](#one-list-picks-one-row).

The OpenRouter page shows the free models, because September promises that the
user needs no card. With no words in the search field, the list holds the free
models. With words, the search reaches every model of the service, and a row
that needs credit reads **Paid**. The rule is `searchModels` in
`packages/core/rules/pick.ts`, where a test can read it without a renderer.

**Automatic** is the first row, and the default. It asks for no model, so the
app sends its own free list and OpenRouter uses the first model that answers.
A named model goes into `setup.defaultModel`. `src/services/ai.ts` sends this
model with each text-generation request.

The setup value can also contain `suggestionsModel`. This value is null by
default. If it contains model settings, Suggestions use them instead of
`defaultModel`. All other text-generation requests continue to use
`defaultModel`.

The default writing selection powers the Agent. The desktop backend forwards a
fixed tool-calling request to OpenRouter or the bundled apfel endpoint. The
Automatic choice uses OpenRouter's `openrouter/free` router, which selects a
current free model that supports the request's tools. The core runtime applies read
tools and changes automatically, and stops only on a delete, until the user
approves or rejects it. Agent changes to Talk rows never speak those rows.

`packages/app-ui/blocks/services.tsx` holds the parts that setup and settings share: the
mode card, the mark of each service, the state pill, and the key panel. A brand
asset is therefore named one time.

### One list picks one row

`PickList` in `packages/app-ui/blocks/pick-list.tsx` picks one row of many. The model
lists and the voice list use it.

A dropdown is not a control for a dwell. It opens on a press, and it closes
when the pointer rests somewhere else. `PickList` stays on the screen: two
columns of 44px rows, as `DESIGN.md` asks, and the row in use has the primary
border. A caller with no room for two columns sends `columns={1}`, as the
320px card of the rail does.

A search field appears above the rows when the list holds more than eight.
Each word of the query must be in the name, through `matchesWords` in
`packages/core/rules/pick.ts`. A caller with another rule sends `filter`, and the model
list sends `searchModels`. A caller with a control for each row sends `after`,
and the voice list sends the play button.

Every change is kept at once, as the Voice card of the rail does. There is no
Save button to forget. A text field waits half a second after the last keystroke, so one
sentence is one write.

The setup steps ask how September runs. Settings does not ask again, because
one answer in two places lets the two disagree.

The speaking style and the personal words go to the writing service as its
user context. `userContext()` in `src/services/ai.ts` assembles them.

Buttons, inputs, and labels come from shadcn/ui. The primitives are in
`packages/ui/components/`. Run shadcn from that package to add one more:

```sh
pnpm --dir ../../packages/ui dlx shadcn@latest add <name>
```

## Run the app

Install Node.js 20 or later, pnpm, Rust, and the Tauri system dependencies.
Then run:

```sh
pnpm install
pnpm tauri:dev
```

The UI dev server uses `http://localhost:3010`. The main desktop window opens at
1376×1032, the project's 13-inch iPad landscape baseline.

Local text generation requires these items:

- An Apple Silicon Mac
- macOS 26 or later
- Apple Intelligence enabled

The backend starts apfel when a screen first asks for its status or generation.
It reuses a healthy process and replaces one that stops responding, so apfel
does not delay an app start that never needs local writing help.

`pnpm tauri:dev` downloads the pinned apfel v1.9.1 binary on the first run.
The command makes sure that both archive and binary checksums match.
`pnpm tauri:build` does the same work before it builds the app bundle.

Run this command to prepare the binary without starting Tauri:

```sh
pnpm apfel:prepare
```

On unsupported systems, September starts without the sidecar. The Rust status
command reports that the local provider is unsupported.

## Try the eye tracker

Select **Eye tracker** in the sidebar. Press **Start camera** to see one camera
box zoomed around your face. When September finds both eyes, press
**Calibrate**. Look at each of the four dots until it moves to the next corner.
The indigo pointer appears after calibration. It is clipped to the box, cannot
press controls, and does not appear on any other page.

AVFoundation and Apple Vision run through Rust. The WebView receives a
320-pixel in-memory face crop, a smoothed eye-relative point, and tracker
status only while the test bed runs. Four calibration samples map that point to
the box. September saves none of them. Press **Stop camera**, or leave the
page, to stop capture and clear calibration.

## Check the UI

```sh
pnpm test
pnpm build
```

The JavaScript tests cover desktop-only navigation and onboarding rules. Rust
tests cover native services, persistence, providers, and process boundaries.

Run the Rust checks from `src-tauri/`:

```sh
cargo test
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
```

The Rust backend stores settings, spaces, Talk messages, Agent messages, notes,
and phrases in SQLite. It provides typed commands for each domain row. See
[`src-tauri/README.md`](src-tauri/README.md) for the complete storage and RPC
contracts.

## Speech and unfinished words

Stop invalidates pending speech as well as stopping playback. A cancelled
cloud result cannot play or trigger system fallback. An already submitted
provider request can still complete and incur charges. Speech failures show a
retry message. Present pauses on an unsuccessful chunk instead of advancing.

Talk saves unfinished words per space in local settings (`talk-draft:<id>`).
These drafts are device-local and are not included in portable backups.
A successful message save clears only the draft that was sent; later edits
remain. Pending or failed saves show their state and offer retry on failure.

Note text and titles start saving on each edit. Writes through the note-update
hook run in order within a space. Browser close/reload warns while a save is
pending or failed; the Mac window close action waits until those edits save.
A forced quit, crash, or power loss before a write finishes can still lose it.

The Welcome screen includes a Terms & privacy summary before personal details
or service connections. It summarizes local storage, optional providers, and
the MIT terms. Full policies open in the browser while setup stays in place.
Get started advances to About you; it does not record consent to optional processing.
