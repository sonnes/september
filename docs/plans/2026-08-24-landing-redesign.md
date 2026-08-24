# Landing page redesign

Approved through three mocks:

- IA: `docs/mocks/2026-08-24-landing-ia-options.html` — structure Option A
- Visual: `docs/mocks/2026-08-24-landing-redesign.html` — final, with all amendments
- Hero: `docs/mocks/2026-08-24-landing-hero-options.html` — hero Option C

Scope: `apps/web` only (`src/pages/home.tsx`, `src/components/home/`). No route,
service, or shared-package changes. The application screens are untouched.

## Approved decisions

1. **Structure (Option A):** nav + hero → Talk (live demo) → Saved phrases & codes
   → Spaces → Your voice → Notes & Present (merged) → Where September works (new)
   → Privacy → About → closing CTA → footer.
2. **Hero (Option C):** split card. Left panel indigo (gradient), carrying the kept
   tagline "Faster Communication / Fewer Keystrokes" with amber accent words, the
   lede, a "Free & open source" badge, Get started (white pill), the open-source
   chip, and the "Everything on this page is the real thing" line. Right panel
   indigo-50, holding a **non-interactive** Talk-console illustration cropped off
   the right and bottom edges: spoken bubble, two pinned chips, a suggestion
   stripe finishing "I'd like a co…" ("coffee," glowing, "please"), and the
   composer with a blinking caret (the only motion; honors reduced-motion).
3. **Tagline fits exactly two lines at every width:** fluid type size
   (`clamp`) with each line an unbreakable block (`block whitespace-nowrap`).
4. **Nav moves above the hero card:** brand + Features · Calls · Privacy · About
   + Get started. Footer carries the same anchors + Source.
5. **Spaces demo rooms:** Family · Friends · Work · Clinic (Café removed).
6. **Notes & Present merged** into one section. New note: "Bedtime story — the
   island adventure" (original Famous-Five-style text, cliffhanger line on the
   Present stage): rowing to the island / Scout barking / Jo's torch, the chest /
   "Treasure," whispered Ben / "But behind them, something moved in the dark…".
7. **New "Where September works" section** (anchor `#calls`): browser card
   ("Start now — nothing to install", Get started) and Mac card ("Your seat at
   the video call", September Microphone & Camera, Apple Intelligence,
   Keychain) with a **Coming soon** badge and a "Follow along on GitHub" link.
8. **Setup-choices section removed.** The closing CTA keeps the caregiver line.
9. **Privacy band** keeps its four facts and absorbs the free/no-account role.
10. Copy follows `docs/plans/2026-08-24-copy-vocabulary.md` throughout.

## File changes

All in `apps/web/src`:

| File | Change |
| --- | --- |
| `components/home/home-redesign.test.tsx` | **First.** Update/extend: section order, `#calls` anchor, merged Notes & Present, no setup section, four space tabs, hero peek is `aria-hidden`, tagline renders two nowrap lines, nav links. |
| `components/home/hero-section.tsx` | Rebuild: nav above the card; split card (indigo copy left, indigo-50 peek right); static peek markup with caret animation (`motion-reduce:animate-none`). |
| `components/home/spaces-section.tsx` | `DEMO_SPACES` → Family, Friends, Work, Clinic (new phrase sets for Friends and Work, same dignified register). |
| `components/home/notes-section.tsx` | Becomes the merged Notes & Present section: new `NOTE_TITLE`/`NOTE_SENTENCES`, play-through, Present stage (existing `presentChunks`/`presentTone` wiring from present-section), export chips row. |
| `components/home/present-section.tsx` | Deleted; its stage/chunk logic moves into the merged section. |
| `components/home/platform-section.tsx` | **New.** "Where September works", `id="calls"`, two cards per mock. |
| `components/home/setup-choices-section.tsx` | Deleted (no longer rendered). |
| `components/home/privacy-section.tsx` | Copy per mock (minor). |
| `components/home/footer.tsx` | Add Calls anchor. |
| `pages/home.tsx` | New section order; drop removed imports. |

Unchanged in substance: `live-demo-section.tsx`, `phrase-codes-section.tsx`,
`voice-section.tsx`, `about-section.tsx`, `enhanced-cta-section.tsx`,
`section-header.tsx`, `use-demo-speech.ts`.

## Order of work (TDD)

1. Write/adjust the failing tests in `home-redesign.test.tsx` (structure,
   anchors, tabs, merged section, removed section, hero lines).
2. `pages/home.tsx` + new/merged/deleted components until green.
3. Hero rebuild; spaces rooms; platform section.
4. `pnpm -C apps/web test`, `build`, `lint`.

## Docs

- Implementation notes → `docs/notes/2026-08-24-landing-redesign.md`.
- `DESIGN.md` Decisions Log: one row for the landing redesign (mock references,
  hero Option C, user-approved).
- `apps/web/README.md`: only if the `components/home` description changes.
