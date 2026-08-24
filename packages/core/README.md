# September core

This package owns platform-independent interaction rules and the autocomplete
engine. It does not import React, browser APIs, or Tauri APIs.

Import rules through explicit subpaths:

```ts
import { spaceSlug } from "@september/core/rules/spaces";
import { buildSuggestionPrompt } from "@september/core/rules/prompts";
```

Import autocomplete through `@september/core/autocomplete`.

Run its checks from the repository root:

```sh
pnpm --filter @september/core test
pnpm --filter @september/core build
```
