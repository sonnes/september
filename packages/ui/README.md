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

`theme.css` also styles the answers of the access layer. A key under a dwell
fills with amber from the bottom, with ink marks at the fill level. The scan
band is an amber fill with an ink line, or an amber ring alone on an element
marked `data-housing`. A key that the scan is on is amber. An accepted press
squeezes the key and shows an indigo check, or two rings with reduced motion.
`[data-contrast='high']` sets every line and every quiet word to the full ink.
`[data-motion='reduced']` stops every animation, the same as
`prefers-reduced-motion`. A disabled key on the stage of Present uses
`key-disabled-on-stage`, which reads `--stage-ink` and `--stage-line` from the
key.

A `Slider` with one thumb gives its `aria-label` or `aria-labelledby` to the
thumb.

Every `Sidebar` menu row, sub row, and row action is 48px. The rows use
`focus-attention-inset`, because the sidebar clips a ring outside a row. The
current row shows a bar at its start edge. `SidebarTrigger` is named Menu and
has `aria-expanded`. `SidebarRail` is a pointer strip only: it has
`aria-hidden` and is not in the tab order, because `SidebarTrigger` does the
same thing. On a phone, the sidebar sheet is named Menu and keeps its close
key.

The `warning` tone of `Callout` is zinc with a warning icon, because
amber marks attention only.

Run the type check from the repository root:

```sh
pnpm --filter @september/ui build
```
