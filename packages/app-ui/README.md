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

The Help home places three common tasks before search and the category list.
Search results preserve catalog order, and every guide link shows its Browser,
Mac app, or Mac keyboard labels. A screenshot renders only when it has a
source and opens at full size. A video renders only when it has both a source
and captions. Missing media leaves the written guide in place without an empty
frame.

`layouts/onboarding.tsx` owns the setup shell. Its indigo panel is the sidebar
from `md` (768px) up and a bar across the top below it — the same width at
which `layouts/app.tsx` turns its sidebar into a sheet. The bar keeps the brand
mark, the numbered steps, and Help; the pitch and the step labels wait for a
screen wide enough. The progress list is one `<ol>` in both shapes, so no step
is announced twice, and each step link keeps its name when its label is
hidden.

`layouts/app.tsx` draws each platform's `APP_NAV` destinations. Every path has
a matching Lucide icon in the layout, including desktop-only destinations.

`pages/settings.tsx` owns the shared Data screen at `/settings/data`. It calls
`@platform/services/backup` to download or restore a backup. The screen parses
the file with `@september/core`, shows its date and row counts, and asks for a
second confirmation before it replaces data.

The same file owns the writing-model controls. Writing settings select the
default service and an optional Suggestions service. The OpenRouter connection
screen selects the default model and the optional Suggestions model.

`pages/agent.tsx` owns the Agent conversation for one space, and the screen
that makes a space. It shows the separately stored transcript and runs
reads and changes without interruption. Only a delete stops for an Approve and
Reject action, and it adds a destructive confirmation on top of that. A turn
that spends its whole write budget stops the same way, so the card still draws
any pending write — an unpin among them, explaining that generation can
replace the phrase later. Agent prompts use the shared
composer with an Ask action and no speech-oriented suggestion stripe, and it
carries the same right rail as Talk and Notes.

`NewSpaceScreen` lives here because making a space is how its conversation
starts. The screen is a doorway: it awaits three local writes — the space, the
words as its note, and a user turn in the transcript — and then hands the user
to that space's Agent, where the space sets itself up on the agent's first
turn. That turn runs on past this screen, so no progress crosses the
navigation and there is nothing to cancel. The model never decides whether to
create.

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
time would talk over a user for as long as the model keeps writing. Only the
finished row is announced.

`pages/steps.tsx` lays a step out for 320px first. Anything that would overflow
that width carries a breakpoint prefix, so a service status drops under the
name rather than squeezing the description, the panel under a service starts at
the edge of its card, and the primary action takes the whole row. Keep new
setup work to the same rule.

`blocks/space-panel.tsx` draws the right rail and the card beside it. The tabs
come from `@september/core/rules/panel`. The rail keeps phrases and speech
settings one press away on every screen inside a space — Talk, Notes, and
Agent. Agent is where the phrases are written, so it is where seeing them
matters most.

`blocks/space.tsx` owns the Talk, Notes, and Agent mode dock. It also keeps the
Talk audio selector beside Speak. The selector names September audio because
each platform service routes September playback; it does not promise to change
the device's system-wide sound output.

`blocks/present.tsx` is the one full-screen surface here. It draws over the
whole viewport instead of inside the shell, because a presentation is for the
room and not for the person holding the keyboard. It stays a block and not a
route, so no app has to change its route set to present a note.

Talk restores its device-local draft before mounting the composer. It saves
each edit through the platform settings service and never clears newer words
when an earlier message finishes saving. Notes save text and titles on input,
keep pending edits visible during query refreshes, and offer retry on failure.
Both screens guard normal closing while writes are pending or failed.

Speech returns whether playback completed successfully. Talk and Read aloud
show speech notices. Present pauses on failure and keeps the unread chunk on
screen for retry or silent use.
