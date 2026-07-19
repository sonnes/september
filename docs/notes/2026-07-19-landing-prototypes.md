---
plan: docs/plans/2026-07-19-landing-prototypes.md
---

# Implementation notes — landing prototypes

Decisions made where the plan/mock was silent, and deviations.

- **Speech seam:** all prototypes speak through one new hook,
  `components/home/use-demo-speech.ts`. Single messages go through the real
  path (`getProvider('browser')` from `SpeechContext` → utterance → app
  `AudioPlayer.enqueue`). Sequences (notes voice-over, reel) need per-sentence
  `onend` callbacks, which `enqueue` drops (it clones the utterance), so the
  hook drives `window.speechSynthesis` directly with provider-built utterances.
  With no speech support, sequences advance on a 2.2s reading-pace timer so
  the visual demo still works.
- **Codes demo uses the real feature:** the phrase-codes implementation landed
  in the working tree while this was being built, so the demo wires straight
  into it — `matchCode`/`trailingWord` from `@/packages/spaces`,
  `codeExpansionText` + a `source: 'code'` stripe (same construction as
  `useStripes`' code path). Rows are marketing-local examples
  (`ty` → Thank you, `hlp` → I need some help please, `wtr` → Water, please)
  rather than the seeded starter pack — user asked for dignified examples on
  the public page (no bathroom phrase); the app seed itself is untouched.
  Verified live: `"I made it, ty"` + take → `"I made it, Thank you "`.
- **Talk "Try it" hint** references `go` → "Good morning" (a real seed phrase)
  instead of the mock's "Water please", which isn't in `DEFAULT_SPACE_SEED`.
- **Talk pinned chips are a curated subset** (`Hello`, `Please`, `Thank you`,
  `Help`) rather than the full seed pinned list — the seed now includes
  care-need phrases (e.g. the bathroom starter-pack row) that the user asked to
  keep off the public page. Suggestions still derive from the seed's non-pinned
  rows. A test guards `bathroom` out of the Talk and codes sections.
- **CTA button label** stays the unified "Get Started" (mock said "Get Started
  — it's free"); one CTA label everywhere is an earlier, test-encoded decision.
- **Voice section reframed around cloning** (user feedback): title "Keep your
  own voice.", the demo card leads with a Clone-your-voice CTA (→ `/onboarding`)
  and keeps the working device-voice preview beneath as "until then". Real
  cloning can't run for an anonymous visitor (needs ElevenLabs), so the CTA is
  honest — it routes into the app instead of faking a clone.
- **Per-section colour lanes** (user feedback: sections read monotonous):
  each feature section gets an accent — Talk indigo, codes amber, spaces sky,
  voice emerald, notes violet, reels rose — the same palette the deleted
  features-grid cards used. Applied to the eyebrow, the "Try it" pill, and the
  demo frame tint via a `SectionHeader accent` prop; headings/body stay zinc.
  A test locks one `bg-*-50` frame per section.
- **Voice demo** uses a native `<select>` styled with the input tokens rather
  than the Radix `Select` — simpler, fully keyboard-operable, and avoids Radix
  portal overhead on a static marketing page. Voices re-list on
  `voiceschanged` since browsers load them lazily. Empty list (some browsers /
  locales) falls back to a calm "No voices available" line with Preview
  disabled.
- **Reel demo** imports the real `reel-theme` tokens (pair colors, role specs,
  grain, vignette, watermark, `captionRoles`, `ensureReelFonts`) — this
  required re-exporting them from the `@/packages/notes` index (README
  updated). The full `NoteReelStoryPlayer` was not reused: it needs alignment
  timing from a voice-over pipeline (ElevenLabs/Kokoro), which a landing
  visitor doesn't have. Caption chunks get shell `ReelCaption` objects (zero
  times) so the real role derivation still runs.
- **Sequenced demos stop on unmount** (`stopSequence` cleanup) and toggle to a
  Stop button while playing.
- **Deleted:** `features-section.tsx`, `how-it-works-section.tsx` (replaced by
  the prototype sections, per approved mock).
- Tests mock `./use-demo-speech` — the real hook needs `SpeechProvider` +
  audio/account providers, which the route supplies; jsdom lacks
  `speechSynthesis` anyway.

## Review round (2026-07-19, after full-page review)

- Amber lane eyebrow darkened to `amber-800` (amber-700 was ~4.0:1 on
  zinc-100, under AA); codes legend `zinc-500` → `zinc-600`.
- Reel grain now composed exactly as the story player (`vignette, grain` in
  one background layer, no opacity multiplier — the old `GRAIN_OPACITY * 4`
  rendered ~4× heavier than a real export). Test locks the composition.
- Space tabs `h-10` → `h-11` (44px floor).
- Codes demo gained a visible Speak button + transcript bubbles (Enter and the
  stripe ↵ speak too).
- Notes demo re-storied to "How we met — for the grandkids" so the note → reel
  thread is one narrative (reel captions are its chunks).
- About blockquote is now verbatim from the article; "clicks are precious"
  moved into prose.
- Footer gained #features/#about anchors (hero nav hides them below md); all
  nav/footer text links got `min-h-11` hit areas.
- Voice Preview demoted to outline so "Start cloning" is the single primary.
- Setup-choices header flattened (was a second indigo band right under the
  privacy band).
- Talk stripe rows get a right-edge fade mask below `sm` to signal scroll.
- Meta/og description updated to the sharper hero copy. Prod preview checked:
  no 404s, no page errors (the dev 404 was dev-server noise).
