# September core

This package owns platform-independent interaction rules and the autocomplete
engine. It does not import React, browser APIs, or Tauri APIs.

Import rules through explicit subpaths:

```ts
import { spaceSlug } from "@september/core/rules/spaces";
import { buildSuggestionPrompt } from "@september/core/rules/prompts";
import { presentChunks } from "@september/core/rules/present";
```

`rules/present.ts` holds the presentation and export rules both apps read: the
seven tones, the chunking of a note, the font fit, the caption timing a video
needs, and why an artifact cannot be saved yet. See
`docs/concepts/note-present-export.md`.

Import autocomplete through `@september/core/autocomplete`.

Run its checks from the repository root:

```sh
pnpm --filter @september/core test
pnpm --filter @september/core build
```
