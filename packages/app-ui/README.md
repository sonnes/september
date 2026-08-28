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

`pages/steps.tsx` lays a step out for 320px first. Anything that would overflow
that width carries a breakpoint prefix, so a service status drops under the
name rather than squeezing the description, the panel under a service starts at
the edge of its card, and the primary action takes the whole row. Keep new
setup work to the same rule.

`blocks/space-panel.tsx` draws the right rail and the card beside it. The tabs
come from `@september/core/rules/panel`. The rail keeps phrases and speech
settings one press away in both Talk and Notes.

`blocks/present.tsx` is the one full-screen surface here. It draws over the
whole viewport instead of inside the shell, because a presentation is for the
room and not for the person holding the keyboard. It stays a block and not a
route, so no app has to change its route set to present a note.
