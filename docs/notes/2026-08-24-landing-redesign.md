---
title: Landing page redesign — implementation notes
plan: docs/plans/2026-08-24-landing-redesign.md
---

What the plan and the mocks did not say, and where the code had to differ.

## Tagline: two clamps, not one

The mock sizes the tagline `clamp(26px, 3.4vw, 44px)`, measured inside a fixed
1376px mock frame where the copy panel is always half the width. In the app the
panel is the full viewport below `lg`, so `3.4vw` collapses to the 26px floor —
and at 320px, "Faster Communication" at 26px runs past the panel edge. The line
cannot wrap (that is the whole point), so it would clip.

The h1 therefore carries two fluid sizes:

- base `clamp(1.25rem, 6vw, 2.25rem)` — the stacked, full-width panel
- `lg` `clamp(1.75rem, 3.4vw, 2.75rem)` — the split card, the mock's own curve

Both lines stay whole at every width, which is the approved constraint; the
mock's exact numbers only hold for the split layout, and they are kept there.

## Hero peek

One `aria-hidden` block, `[data-hero-peek]`, with no anchors, buttons, or form
controls inside — the cropping already cuts the controls in half, and a
half-visible target under a screen reader would be worse than none. The caret
uses `animate-caret-blink` (from `tw-animate-css`, already imported by the UI
theme) with `motion-reduce:animate-none`.

Mobile keeps the peek rather than hiding it: shorter gallery (`min-h-[300px]`)
with smaller crop offsets, so the promise of the product visual survives on a
phone.

## Notes & Present, merged

- The mock's note body reads `"Treasure," whispered Ben. "Real treasure!"` as
  one run. `NOTE_SENTENCES` splits it into two entries so the play-through
  highlights one clause at a time; joined, the text is identical to the mock.
- One demo card holds both halves: note → **Play voice-over** (solid) and
  **Present** (outline) → stage → export chips. Present is the quieter of the
  two so the reading, not the stage, stays the primary action.
- The export chips are static labels, not buttons. The page's contract is that
  everything shown is real; a chip that did nothing would break it, and real
  export belongs to a note that exists in the app.
- `PRESENT_CHUNKS` moved to `notes-section.tsx` with the note it comes from and
  is still cut by `presentChunks` from `@september/core`.

## Elevation

Asked for during implementation: the page's big surfaces now share the hero
card's shadow. One scale, top to bottom —

- **`shadow-lg`** on every section surface: the hero card, all five demo shells,
  both platform cards, the privacy band, the closing CTA.
- **`shadow-sm`** on the white cards nested inside those shells, so the
  hierarchy still reads.
- **`shadow-xl`** only on the hero peek, which is cropped off two edges and has
  to look like it continues past the panel.

This is heavier than the `shadow-sm` the DESIGN.md cards row describes; the
landing page is marketing, not a work surface, and the decisions log records it.

## Smaller calls the spec was silent on

- **Nav CTA.** The mock's nav carries a Get started pill, so the hero now has
  two links to `/welcome` (nav + card). Both are `h-11`. The earlier test that
  asserted exactly one has been updated rather than deleted.
- **Spaces lede** said "one for going out", which was the Café room. It now
  names the four approved rooms.
- **About** moved to the gray band. With the setup section gone, the white
  bands would otherwise run three deep from privacy to the closing CTA.
- **Section accent `rose`** is now unused (it was the Present chapter's lane).
  It stays in `section-header.tsx` as part of the palette.
- **Tests import `HomePage` relatively.** The `@/` alias does not resolve under
  the Vitest resolver; every other suite in the app imports relatively too.

## Verification

`pnpm -C apps/web test` (68 passing), `build`, and `lint` are green.
