---
title: Landing hierarchy implementation notes
plan: ../plans/2026-09-05-landing-hierarchy.md
---

- The checkpoint is `565c313a`. It excludes the ongoing legal, deployment, and application changes.
- The Agent result preview derives phrases and note text from the existing demo tool arguments. The full conversation remains expandable.
- Privacy follows the working demos. The browser and Mac choices supply the final calls to action.
- Pre-checkpoint checks encountered unrelated Notes and speech failures in the shared working tree.
- Final checks: 13 landing interaction tests pass; lint and production build pass. Browser checks cover 320, 390, 768, 1376, and 1440px, including Agent choices, space switching, phrase expansion, and keyboard disclosures.
- The full web suite has one unrelated failure in `src/talk-saving.test.tsx` while the concurrent Talk draft changes are in progress.
- The enlarged Talk controls need an automatically growing frame; the previous fixed height cropped its bottom tabs.

- The example review replaces care-centered defaults with opinions, humor, family plans, creative work, and book discussion. The bedtime story remains. Hero, Talk, codes, space phrases, Agent requests/results, and voice preview now follow the About narrative.

- Each space now owns its phrase codes and typing prompt. The book discussion examples now concern Silo, with speculative questions and no plot spoilers.
