# September UI

This package owns the design tokens and generic React primitives used by the
web and desktop applications. The components follow the shadcn/ui patterns and
use Radix primitives where a control needs headless behavior.

Import a component through its explicit subpath:

```tsx
import { Button } from "@september/ui/components/button";
import { Card, CardContent } from "@september/ui/components/card";
```

The package root exports all primitives, `cn`, and `useIsMobile` for callers
that prefer a grouped import.

Each app's CSS entry point imports the shared theme and scans this package:

```css
@import "@september/ui/theme.css";
@source "../../../packages/ui";
```

`theme.css` owns the fonts, semantic colors, dark tokens, scrollbar treatment,
and the `control`, `chip`, and `surface` radius roles from `DESIGN.md`.

Run the type check from the repository root:

```sh
pnpm --filter @september/ui build
```
