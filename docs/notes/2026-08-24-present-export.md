---
title: Present and export a note — implementation notes
description: Decisions made where the approved plan was silent, deviations, and reviewer notes.
plan: ../plans/2026-08-24-present-export.md
---

# Present and export a note — implementation notes

Only decisions and deviations not already stated in the plan belong here.

## Placement

- The plan was written before the workspace refactor (`8f1a431`) and describes
  a mirrored `apps/*/src/rules/present.ts` and `apps/*/src/blocks/present.tsx`.
  There is one shared source now, so the rules landed in
  `packages/core/rules/present.ts` and the stage in
  `packages/app-ui/blocks/present.tsx`. Each app keeps a one-line compatibility
  export at `src/rules/present.ts`, as it does for every other shared rule.
- Only two things are per-app: `src/services/export.ts` and, on the web,
  `synthesizeTimed` plus the canvas renderer in `src/services/video.ts`.

## Rules

- The role rule is one step wider than the plan's wording. A heading is
  display, **and** the first non-heading chunk of a section is display, so a
  section that opens with a heading gets a title card and an opening line
  rather than a title card and small text.
- The plan asked for a pretext fit ("largest font that fits"). `@chenglou/pretext`
  went with the retired code, and adding it back for one measurement would put
  a dependency between the stage and the exporter. `chunkFontRatio` is a pure
  rule instead: it solves for the font size from the character count and the
  shape of the stage, and both surfaces read it. The canvas still measures
  words for the wrap, which only the canvas can know.
- Long-sentence splitting avoids regex lookbehind. Safari added it in 16.4, and
  a lookbehind in a module is a parse error, not a runtime one — the whole app
  would fail to load on an older iPad.
- `wordsToCaptions`, `alignmentToWords`, and `captionRoles` are the retired
  timing code, restored unchanged apart from their names.

## Analytics

- `note_present` and `note_export` are new `UsageEventType` values. The Rust
  side stores the type as a string, so there is no migration, but
  `summarizeUsage` and `toRecentCalls` treated every non-`message_sent` event
  as a provider call. Both now filter to `ai_generation` and `tts_generation`,
  so a story told in the room does not appear beside the calls the user pays
  for. `AnalyticsEvent` in the web repository now takes its union from
  `@september/core` instead of keeping a second copy.

## Tests

- The plan names `copy.test.mjs` and `copy-contract.test.ts`. Neither survived
  the refactor. The naming contract is a single test in the desktop suite that
  reads every `.ts`/`.tsx` file under both apps and both UI packages for the
  retired name, with comments stripped — a comment may still record which
  feature this one replaced.
- The overlay has real rendering tests
  (`apps/web/src/present-overlay.test.tsx`), using the `createRoot` + `act`
  pattern the landing-page suite already uses. No testing-library was added.
- The video renderer has no automated test. It needs a canvas, a font, and
  `ffmpeg.wasm`; the parts that can be tested without a browser (caption
  timing, roles, tones, the fit) are pure rules and are covered.

## Deliberate gaps

- Desktop video export is not built. `ffmpeg.wasm` loads its core through a
  blob URL and the window's `script-src` is `'self' 'wasm-unsafe-eval'`.
  Widening the policy for one export is a poor trade, so the row states the
  reason and stays in place. `VIDEO_EXPORT = false` is the single switch.
- Word-level karaoke inside the live stage is still out of scope, as the plan
  says. The timing service that unlocks it now exists.
- The camera bridge restores the Talk draft by way of the Talk screen: the
  stage pushes each chunk and clears the words on close, and the audio selector
  pushes the draft again when Talk mounts. The selector lives in Talk only, so
  there is no draft to restore while Notes is open.

## Landing page

- `reels-section.tsx` became `present-section.tsx`. Its stage is built from the
  real `presentChunks` and `presentTone`, so the page shows the shipped
  chunking rather than a drawing of it, and the note above it stays the same
  story.
