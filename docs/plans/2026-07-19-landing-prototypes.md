# Landing redesign — every feature is a working prototype

- **Mock (approved structure & copy):** `docs/mocks/2026-07-19-landing-prototypes.html`
- **Notes file:** `docs/notes/2026-07-19-landing-prototypes.md`
- **Status:** approved (copy ok; prototypes must use real components)

The home page stops describing features with skeleton screenshots and instead
gives every feature a live, touchable prototype built from the app's real
components. Speech is real (browser TTS through the app's speech stack).

## Structure (final)

| # | Section | Component | Prototype |
| - | ------- | --------- | --------- |
| S0 | Hero | `hero-section.tsx` (edit) | — adds "Everything on this page is the real thing" line |
| S1 | Talk | `live-demo-section.tsx` (edit) | existing live demo + real TTS on Speak |
| S2 | Saved phrases & codes | `phrase-codes-section.tsx` (new) | `EditorProvider` + `SuggestionStripes`; demo-local code match (`ty`/`hlp`/`iwb`) |
| S3 | Spaces | `spaces-section.tsx` (new) | space tabs swap phrase pills; tap speaks |
| S4 | Voice | `voice-section.tsx` (new) | device voices via browser speech engine + preview |
| S5 | Notes | `notes-section.tsx` (new) | sentence-by-sentence voice-over with highlight |
| S6 | Reels | `reels-section.tsx` (new) | 9:16 frame from `reel-theme` tokens; spoken caption sequence |
| S7 | Privacy band | `privacy-section.tsx` (new) | static indigo band |
| S8 | Setup choices | `setup-choices-section.tsx` (keep) | — |
| S9 | CTA + footer | `enhanced-cta-section.tsx` (edit copy), `footer.tsx` (keep) | — |

Dropped: `features-section.tsx` (skeleton cards), `how-it-works-section.tsx`
(1-2-3 cards) — prototypes replace both.

## Real-component wiring

- **Speech:** route wraps sections in `SpeechProvider` (inside the existing
  `ClientProviders`, which already provides Account/AISettings/AudioPlayer).
  Default speech config is `browser` — no account/setup needed.
- **`use-demo-speech.ts`** (new, `components/home/`): one thin hook all
  prototypes share — `speak(text, voice?)` (enqueue utterance on the app
  `AudioPlayer`), `speakSequence(parts, callbacks)` (chained utterances for
  sentence highlight), `listVoices()`. Tests mock this seam.
- **Codes demo:** code table is demo-local (`ty`, `hlp`, `iwb` — the approved
  starter pack from the phrase-codes plan); rendering + take behavior go
  through the real `SuggestionStripes`/`stripeForText` so a code tap swaps the
  trailing code for the phrase exactly like a stripe take.
- **Reels demo:** frame chrome (pair colors, role specs, grain, vignette,
  watermark) imported from `@/packages/notes` `reel-theme` — requires adding a
  reel-theme export to the notes package index (+ README).

## TDD

Rewrite `home-redesign.test.tsx` first: update hero/talk/CTA copy assertions,
delete features/how-it-works tests, add render + interaction tests for each new
section (with `use-demo-speech` mocked). Red → implement → green. Before
commit: `pnpm -C apps/web lint && pnpm -C apps/web test && pnpm -C apps/web build`.

## Copy deviations from mock (recorded in notes file)

- Talk "Try it" hint references the real seed suggestion ("Good morning"), not
  the mock-only "Water please".
- Final CTA button label stays the unified "Get Started" (no "— it's free"
  suffix) — one CTA label everywhere.
