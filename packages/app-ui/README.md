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
