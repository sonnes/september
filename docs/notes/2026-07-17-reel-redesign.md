---
title: Reel redesign — implementation notes
plan: docs/plans/2026-07-17-reel-redesign.md
---

# Reel redesign — implementation notes

Records only decisions the plan left open and deviations from it.

## Padding: kept `defaultPretextPadding`, dropped `SIDE_PADDING_RATIO`

The plan listed "side-padding ~7% width" as a chrome constant. Both renderers
already derive side padding from `defaultPretextPadding` (6% of the min
dimension = 6% width for a 9:16 frame), and — critically — they must use the
*same* padding or the fitted font/line-breaks diverge between the DOM preview
and the MP4. Rather than add a second, slightly different ratio, both call
`defaultPretextPadding(width, fullHeight)` and pass it explicitly to
`computePretextLayout`. The exported `SIDE_PADDING_RATIO` constant was removed as
dead code. 6% ≈ the plan's "~7%".

## `computePretextLayout` internal `pillPaddingX = 32` left as-is

The engine unconditionally subtracts a 32px pill inset (`use-pretext-layout.ts`).
The new look has no pills, but **both** renderers still call the same function,
so they subtract it equally and stay matched. Removing it would be a wider change
to a shared engine for no visible benefit and risks desyncing other viewers, so
it stays. Player and exporter now pass `lineExtraPx: 0, lineGapPx: 0` (the
exporter already did).

## `ReelRenderer` stayed generic; the theme lives in `packages/notes`

`reel-theme.ts` is in `packages/notes` (alongside the caption model), but
`ReelRenderer` is in the lower-level `packages/audio`. To avoid an audio→notes
dependency, `ReelRenderer` takes plain style props (colours, opacities, ratios)
with sensible defaults; the notes **story player** reads the theme and passes
concrete values down. Word-state opacities are defined both in the theme
(`SPOKEN_OPACITY`/`UNSPOKEN_OPACITY`, consumed by the canvas exporter and passed
into `ReelRenderer` by the player) and as matching defaults on `ReelRenderer`
for its other, non-reel callers (`/preview`, the export preview thumbnail).

## Watermark sizing via container queries (DOM)

The player frame is `@container`; the watermark uses
`clamp(11px, 3.47cqw, 22px)` so it scales with the frame without a
`ResizeObserver`. The canvas exporter sizes it from `WATERMARK_FONT_RATIO * width`
at the same left/bottom ratios. Text-only "September" in both (the mock's diamond
dot and EQ sound-bar were decorative and skipped per plan).

## Vignette on canvas is an ellipse approximation

The CSS gradient is `radial-gradient(130% 100% at 50% 35%, …)` — an ellipse.
Canvas radial gradients are circular, so the exporter translates to the centre,
`scale(rx/ry, 1)`, and draws a circular gradient of radius `ry`. Grain is
per-pixel monochrome noise blended at `GRAIN_OPACITY` via a tile canvas
(`putImageData` replaces, `drawImage` blends). The plan only requires grain to
match in opacity/scale, not pixel-for-pixel.

## Manual side-by-side check still owed

Automated tests + `pnpm build` pass. The plan's manual step — story player and a
generated MP4 side by side per pair — needs a live ElevenLabs/Kokoro timed voice
to produce audio+alignment, which isn't available in this environment. The canvas
drawing paths (grain/vignette/watermark/serif `fillText`) aren't exercised by
jsdom tests (no real 2D context), so that visual pass remains to be done in a
browser.
