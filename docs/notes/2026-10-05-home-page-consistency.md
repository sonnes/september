---
title: Home page consistency
date: 2026-10-05
plan: ../plans/2026-10-05-home-page-consistency.md
---

# Home Page Consistency

Decisions where the plan was silent:

- The agent test for the Doctor calls space checks the label and the start of the ask as well as the missing note, so one test covers steps 7 and 8.
- The expression test reads the text nodes beside the tag span and compares them across the moods. It does not pin the sentence, so the sentence can change without a test change.
- The transcript test for the history row checks the sentence and the row together, because the icon is the only thing that says "said before".
- The `FileText` import stays in `agent-section.tsx`. The Work presentation result still uses it for the note title.
- Step 5 and step 10 have no test, as the plan said.

Deviations from the plan: none.
