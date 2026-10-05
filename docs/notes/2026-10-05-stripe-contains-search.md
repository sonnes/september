---
plan: docs/mocks/2026-10-05-stripe-contains-search.html
---

# Stripe Contains Search

The approved mock is the plan. These notes record the decisions that the mock does not state.

## Decisions

- The draft must start at the start of a word. `ate` does not find `water`. A substring match gave rows with no clear link to the draft.
- The search prompt applies to a draft of two words or fewer. As a result, a short opening such as `That is ` also gets the search prompt, and fewer model rows continue it.
- A model row that does not hold the draft keeps the place that model rows had before this change. A model that breaks the old rule does not lose rows.
- The phrase-code row, the one-word chips, and the word row did not change. A code is an exact match, and a one-word chip gives the same result with either match.

## For the Reviewer

- The two UI tests in `apps/web/src/suggestion-slices.test.tsx` were written after the change in `packages/core`. They passed at the first run, because the behavior comes from the core rules. The core tests failed first, as TDD requires.
- The underline on the found tiles has no test, because the tests do not pin visual design.
