---
title: Saved phrases per space — Implementation Notes
plan: (harness plan) let-us-bring-back-eager-key
---

# Saved phrases per space — notes

Only decisions/deviations not already in the plan.

## Decisions where the spec was silent

- **`replaceAiPhrases` takes `syncedCount` explicitly.** The plan described it as
  `replaceAiPhrases(spaceId, userId, aiTexts)` "then `updateSpace({ phrases_synced_count })`".
  The synced count is the message count at generation time, which the mutation
  can't know on its own, so the signature is
  `replaceAiPhrases(spaceId, userId, aiTexts, syncedCount)`.

- **Decision/prompt logic lives in pure `lib/phrases.ts`, not in the hooks.**
  `decidePhraseSync` (seed / regen / none) and `buildPhrasesPrompt` (which embeds
  the full existing collection) are pure and unit-tested in `lib/phrases.test.ts`.
  The plan listed `use-generate-space-phrases.test.ts` and
  `use-sync-space-phrases.test.ts`; rather than add brittle React effect/renderHook
  tests (the repo has no renderHook harness — component tests use raw `react-dom`),
  the substantive logic is covered by the pure tests. The hooks themselves are thin
  effect wrappers around the tested pure functions + `useGenerate` + mutations.

- **Phrase tab insert spacing.** Inserting reuses the same spacing rule as the
  editor's `addWord` (space-separate unless the composer is empty / already ends
  in whitespace). It does not call `trackKeystroke`, preserving the
  keystrokes-saved analytic (same invariant the suggestion stripe follows).

- **History window = 20 messages** fed to the generator (`HISTORY_WINDOW`).

- **`HISTORY_WINDOW`/`STRIPE_SAVED_LIMIT`/`PHRASES_STALE_AFTER`** are module
  constants, not settings — kept simple per "no speculative configurability".

## Deviations from current behavior (intended)

- The suggestion stripe no longer parses `space.context` / `account.context`
  bullets for curated phrases; the curated source is now `space.phrases` (top 5).
  `account.context` global curated chips are dropped (saved phrases are per-space).
  `space.context` still steers the LLM and is still editable in the Context tab.
- The stripe pin button now calls `addManualPhrase` (saves a pinned phrase)
  instead of appending a `- bullet` to `space.context`.

## Verification status

- `pnpm test` — 401 passed (36 files), incl. new `lib/phrases.test.ts` and the
  extended `mutations.test.ts`.
- `pnpm build` — exit 0 (prerender OK).
- `pnpm exec tsc --noEmit` — the only errors in touched files are the pre-existing
  TanStack DB `createCollection`/`useLiveQuery` overload mismatches that
  `db.ts`/`use-messages.ts`/`use-spaces.ts`/`documents/db.ts` already emit; build
  uses esbuild so they don't gate it.
- `pnpm lint` — pre-existing baseline failure only (`build.mjs` no-undef; warnings
  in files not touched here). No new lint findings in changed files.
