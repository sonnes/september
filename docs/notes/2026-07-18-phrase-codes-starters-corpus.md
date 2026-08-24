---
plan: docs/plans/2026-07-18-phrase-codes-starters-corpus.md
---

# Implementation notes — phrase codes, starters & corpus

Running notes: decisions where the plan was silent, deviations, reviewer flags.

## Decisions (spec was silent)

- **`kind` stays optional in the schema** (`kind?: 'phrase' | 'starter'`) rather
  than zod `.default('phrase')` — collection rows are not re-parsed through the
  schema on load, so a defaulted output type would lie about persisted rows.
  Readers treat `undefined` as `'phrase'` via `rowKind()`.
- **Take-consumes-trigger needs no new take logic.** Stripe take (`selectUpTo`)
  sets the composer to the stripe's own tokens; a code stripe's text is the full
  composer text with the trailing code replaced (`codeExpansionText`), so the
  existing partial-take path consumes the trigger for free. The pure transform
  is tested in `lib/stripes.test.ts`.
- **Dictionary check ships as a built-in common-word list** (`isCommonWord`,
  ~short words up to 5 chars — the only lengths codes can take). The plan's
  "inject the autocomplete trie" stays possible (`isWord` is injectable
  everywhere) but the right panel is not otherwise coupled to the editor's
  autocomplete engine, so v1 uses the built-in list.
- **Auto-codes are for `kind: 'phrase'` only.** Seeding does not auto-assign
  codes to starters (a prefix's initials are rarely a memorable trigger); users
  can still set one manually.
- **Seed starter pack**: codes added to the existing General-space seed —
  `ty` → Thank you, plus two new pinned rows `iwb` → I want to go to the
  bathroom, `hru` → How are you?.
- **Mining is space-scoped**, not global: the Phrases tab computes proposals
  from the space's own last 300 user messages (the tab is per-space and a kept
  proposal lands in that space). Dismissals persist globally in
  `localStorage` under `september:mined-dismissed` (normalized texts).

## More decisions made while implementing

- **Composer word-chip source unchanged**: `topPhrases` now excludes starters
  (kind-filtered), so single-word chips still come only from phrase-kind rows.
- **Curated stripe budget**: 5 rows total; up to 2 starters, phrases fill the
  remainder (`STRIPE_SAVED_LIMIT - starters.length`) — a space with no
  starters still shows 5 phrases like before.
- **Code stripe vs MAX_COMPOSED**: a code match prepends its row and the list
  re-caps at 6 (`slice(0, MAX_COMPOSED)`), dropping the last composed row
  rather than exceeding the budget.
- **Mining "independent support"**: a sub-phrase's occurrences don't count in
  messages already covered by a kept longer candidate. This is what makes
  "keeps only the maximal phrase" work without suppressing genuinely
  independent sub-phrases (the plan's "maximal filter" was underspecified).
- **`generateCode` keeps "I" and "you"** as content words (Thank you → `ty`,
  I want to go to the bathroom → `iwgb`); classic function words are dropped.
  Generated codes cap at 4 chars so one mutation char fits `CODE_MAX = 5`.
- **AI seed codes for `kind: 'phrase'` only** (starters get none — a prefix's
  initials are rarely a memorable trigger); user can still set one manually.
- **Phrases-tab code editing**: badge click opens a tiny inline editor (Enter
  saves, Esc cancels, blur saves, empty clears); AI rows show a muted badge
  whose tooltip explains the code refreshes with regeneration.
- **Mining runs on tab render** (memo over `useMessages` limit 300), not on
  app open — cheapest correct trigger; recompute is milliseconds.

## Deviations from plan

- Plan said mining could be "global across spaces"; implemented **space-scoped**
  (the tab's messages), with the dismissed-set global. Rationale in Decisions.
- Plan's "starter pack" list (`hlp` → I need some help please) trimmed to
  `ty`/`iwb`/`hru` — the seed already has "Help" and adding a near-duplicate
  phrase felt redundant.
- `tsc --noEmit` has pre-existing failures across the repo (TanStack DB
  generics, og-image); the repo gates on lint+test+build, all green. No new
  type errors in touched files' authored lines.
- A concurrent landing-page redesign (hero/live-demo/home-redesign.test) is in
  the working tree and its test suite references not-yet-created files; that
  failure predates/parallels this work and is untouched.

## Phase 6 status

Not started — gated on the 6a corpus experiment (needs a provider to generate
sample corpora). Phases 1–5 ship without it.
