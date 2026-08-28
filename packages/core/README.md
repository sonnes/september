# September core

This package owns platform-independent interaction rules and the autocomplete
engine. It does not import React, browser APIs, or Tauri APIs.

Import rules through explicit subpaths:

```ts
import { spaceSlug } from "@september/core/rules/spaces";
import { buildSuggestionPrompt } from "@september/core/rules/prompts";
import { presentChunks } from "@september/core/rules/present";
import { searchHelpGuides } from "@september/core/rules/help";
```

`rules/present.ts` holds the presentation and export rules both apps read: the
seven tones, the chunking of a note, the font fit, the caption timing a video
needs, and why an artifact cannot be saved yet. See
`docs/concepts/note-present-export.md`.

`rules/help.ts` holds the task-based Help catalog shared by the browser and
desktop apps. It keeps guide slugs, category order, platform labels, written
fallbacks, related links, and search independent of a renderer.

`rules/panel.ts` keeps the Phrases and Voice tabs of the shared space rail,
including the tab and open state restored from settings.

`rules/titles.ts` writes what the browser tab says. `documentTitle` puts the
part that tells two tabs apart first and the name of the app last, because a
user often keeps one tab open per person they talk to.

Import autocomplete through `@september/core/autocomplete`.

Run its checks from the repository root:

```sh
pnpm --filter @september/core test
pnpm --filter @september/core build
```
