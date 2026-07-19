# Reel Redesign — Editorial Theme, Consistent Player & Export

Mock (approved direction): `docs/mocks/2026-07-17-reel-redesign.html`

## Goal

One visual system for note reels, rendered identically by the in-app story
player (DOM) and the exported MP4 (canvas). Editorial look: serif display
headlines + Noto Sans support text, Tailwind color pairs on solid backgrounds,
film grain + vignette, watermark. Replaces today's drift (zinc-900 player with
subtle pill highlight vs `#111827` export with diagonal grid and amber
highlight).

## Design spec (from mock)

- **Color pairs** (stock Tailwind shades; one pair per reel, default `stone`):

  | key     | bg (`900/950`)        | display (`200`)       | support (`50`)        |
  | ------- | --------------------- | --------------------- | --------------------- |
  | stone   | `stone-900` `#1c1917` | `amber-200` `#fde68a` | `stone-50` `#fafaf9`  |
  | emerald | `emerald-950` `#022c22` | `emerald-200` `#a7f3d0` | `emerald-50` `#ecfdf5` |
  | slate   | `slate-900` `#0f172a` | `sky-200` `#bae6fd`   | `slate-50` `#f8fafc`  |
  | rose    | `rose-950` `#4c0519`  | `rose-200` `#fecdd3`  | `rose-50` `#fff1f2`   |
  | purple  | `purple-950` `#3b0764` | `purple-200` `#e9d5ff` | `purple-50` `#faf5ff` |
  | indigo  | `indigo-950` `#1e1b4b` | `indigo-200` `#c7d2fe` | `indigo-50` `#eef2ff` |

- **Roles** (per caption chunk, derived from punctuation — deterministic):
  - A chunk is **display** when it is the first chunk or the previous chunk
    ends a sentence (`/[.!?]$/` on its last word). Otherwise **support**.
  - **Display:** Playfair Display 500, line-height 1.08, color = pair display
    tint, active word = pair support tint. Pretext max font ≈ 40% of frame
    width.
  - **Support:** Noto Sans 700, line-height 1.35, color = pair support tint,
    active word = pair display tint. Pretext max font ≈ 11.5% of frame width.
- **Word states:** spoken opacity 0.55 · active 1.0 (color swap) · unspoken 0.88.
- **Frame chrome (both renderers):** solid pair bg, film grain (~0.06 opacity
  noise) + soft radial vignette (transparent to ~0.32 black at edges),
  "September" watermark bottom-left, caption block centered, fitted within
  ~62% frame height (display) / ~50% (support), side padding ~7% width.
- **Player-only chrome:** segmented story progress (2.5px), close button, tap
  zones, caption rise-in animation (respect `prefers-reduced-motion`).
  Not in export.
- Grain must match in opacity/scale, not pixel-for-pixel (stochastic texture).

## Implementation steps (TDD each)

### 1. Shared theme module — `apps/web/src/packages/notes/lib/reel-theme.ts`

The single source both renderers consume.

- `REEL_PAIRS`: the table above — `{ key, bg, display, support }` hex values +
  Tailwind class names for the DOM side.
- `CaptionRole` = `'display' | 'support'`; `captionRoles(captions): CaptionRole[]`
  implementing the punctuation rule (pure, from `ReelCaption[]`).
- `ROLE_SPECS`: per-role `{ fontFamily, fontWeight, lineHeightRatio,
  maxFontRatio, boxHeightRatio }`.
- Word-state constants: `SPOKEN_OPACITY = 0.55`, `UNSPOKEN_OPACITY = 0.88`.
- Chrome constants: vignette stops, grain opacity, watermark text/position
  ratios, side-padding ratio.
- Tests first: role derivation across sentence shapes (first chunk, `.`/`!`/`?`,
  `,;:` continuations, single-chunk note), pair table completeness.

### 2. Serif font

- Add `@fontsource/playfair-display` (weight 500) alongside existing
  `@fontsource/noto-sans`; import in app entry with the other fonts.
- `ensureReelFonts(): Promise<void>` in `reel-theme.ts` —
  `document.fonts.load()` for both faces (500 Playfair, 700 Noto Sans).
  Both player and exporter await it before first layout; `fonts.ready` alone is
  not sufficient (unused faces may not have been fetched).

### 3. Pretext layout per role

`computePretextLayout` already accepts `fontFamily`/`fontWeight`/
`lineHeightRatio`. Extend call sites to pass role specs and a
`maxFontSize` derived from `maxFontRatio * containerWidth`. No pill padding in
the new look → `lineExtraPx: 0`, `lineGapPx: 0` (exporter already does this;
player's `ReelRenderer` must drop the pill boxes). Test: same caption + role +
container in DOM helper and exporter helper produce the same
`fontSize`/line breaks (already true via shared function — add a regression
test that both call sites use role specs).

### 4. Player — `note-reel-story-player.tsx` + `ReelRenderer`

- `ReelRenderer` (audio package): accept `role`-shaped style props
  (font family/weight, line-height ratio, max-font ratio, per-state colors)
  instead of hardcoded pill wrappers; keep the `getWordStatus` contract.
  Word spans: color swap for active, opacity for spoken/unspoken, no pill.
- Story player: bg from selected pair class, grain + vignette overlay divs,
  watermark, thinner progress segments, rise-in on chunk change with
  `prefers-reduced-motion` fallback, `ensureReelFonts()` before showing text.
- Role per chunk from `captionRoles`; display chunks fit in 62% height box,
  support in 50%.
- Tests: rendered caption uses display font for sentence-opening chunk and
  support font for continuation; active word color equals pair tint; watermark
  present.

### 5. Exporter — `reel-renderer.browser.ts`

- Replace `BACKGROUND_COLOR`/`HIGHLIGHT_COLOR`/`TEXT_COLOR`/`drawGrid` with
  pair + role rendering from `reel-theme.ts`:
  - background: solid pair bg → grain (noise canvas at theme opacity) →
    vignette (radial gradient) → watermark (support tint, same position ratio
    as player).
  - `layoutCaption` takes the chunk's role spec (font, weight, line-height,
    max size, box height ratio).
  - `drawCaption`: display/support colors, active word color swap, spoken 0.55
    / unspoken 0.88 alpha.
- `RenderNoteReelVideoInput` gains `pairKey` (default `'stone'`).
- Await `ensureReelFonts()` before rendering frames (canvas `measureText` and
  `fillText` need the serif loaded).
- Tests: extend `reel-renderer.browser.test.ts` — frame specs unchanged;
  layout uses role spec; input validation with pair key.

### 6. Pair selection — `note-reel-export-panel.tsx`

- Six-swatch pair picker (two-tone circles, `aria-label` with pair name,
  ≥44px targets) above the actions; selection stored in component state,
  default `stone`, passed to both `NoteReelStoryPlayer` and
  `renderNoteReelVideoWithWasm`. No persistence yet (follow-up if wanted).
- Preview thumbnail: swap `bg-foreground` box for the selected pair's bg class
  so the mini preview matches.
- Tests: picker renders six options; choice reaches exporter input and player
  props.

### 7. Docs

- Update `docs/concepts/space-notes.md` (reel look + pair choice).
- Update module READMEs: `packages/notes`, `packages/audio`.
- `DESIGN.md` decisions log: serif display font + Tailwind pairs are a
  deliberate deviation for exported reel artifacts only (not app UI); Playfair
  Display joins Noto for this surface alone.
- Implementation notes in `docs/notes/2026-07-17-reel-redesign.md` as work
  proceeds.

## Order & verification

1. Theme module + tests (`pnpm test` red → green)
2. Font package + `ensureReelFonts`
3. `ReelRenderer` restyle + player chrome (tests)
4. Exporter restyle (tests)
5. Pair picker in export panel (tests)
6. `pnpm lint && pnpm test && pnpm build`; manual check: story player and a
   generated MP4 side by side on the same note, each pair spot-checked
7. Docs pass

## Out of scope

- Persisting pair choice per note/space
- Serif font switcher in-app (mock offered Fraunces/Prata for comparison only;
  shipping Playfair Display)
- Photo/image backgrounds
- Sound-bar EQ ornament from the mock (decorative; skip unless asked)
