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

`Switch` is the shadcn switch at 24px. Put it in a row with a `Label` that
names it, so the row gives the 44px target that `DESIGN.md` asks for.

`theme.css` owns the fonts, semantic colors, dark tokens, scrollbar treatment,
and the `control`, `chip`, and `surface` radius roles from `DESIGN.md`. It also
owns the reach tokens: `--reach-target`, `--reach-gap`, `--reach-word`, and
`--reach-scale`. Every text role grows with `--reach-scale`. No text role is
smaller than 14px.

`cn` knows the radius roles and `text-title`, so a later role replaces an
earlier one. `Button`, `Input`, `Tabs`, the `Select` trigger, the menu rows,
and the close key of `Sheet` and `Dialog` take their height from
`--reach-target`, 48px at the smallest.

A focusable primitive shows focus with the `focus-attention` class: a 2px ink
outline inside a 5px amber ring. A menu item or a scroll area uses
`focus-attention-inset`, which draws the same focus inside its edge. A disabled
key uses `key-disabled`, so it loses its fill and gets a dotted border.

A `Slider` with one thumb gives its `aria-label` or `aria-labelledby` to the
thumb. The `warning` tone of `Callout` is zinc with a warning icon, because
amber marks attention only.

Run the type check from the repository root:

```sh
pnpm --filter @september/ui build
```
