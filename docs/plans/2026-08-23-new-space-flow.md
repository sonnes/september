---
title: The new space flow — fixes
description: Rebuild `/spaces/new` on the Talk shape with the shared composer, make the model work visible while it runs, and close the nine findings of the review.
status: plan, not approved
---

# The new space flow — fixes

The review of `/spaces/new` found nine things. Two of them can make a space
unreachable or duplicate it. The rest are the cost the screen puts on the
person using it: no typing help on the screen that asks for the most typing, no
way out while two models run, and nothing said when anything fails.

Two directives shape the answer:

- **The model work must be visible while it runs.** A changing button label is
  not visible progress, and it is not announced at all.
- **The create screen reuses an empty Talk page with our composer.** Not a
  textarea beside it — the same `Composer`, so the word tiles, the codes, the
  suggestion stripe, undo, and delete-last-word are all there.

The second directive is already the rule in `apps/desktop/CLAUDE.md`: *Write
through `Composer` in `src/blocks/space.tsx` in every mode. A second console
would leave one mode without the word tiles, the codes, or undo, which a user
who cannot type depends on.* The new-space screen is the one place that broke
it.

## Goal

A user presses the plus, answers one question with the same console they use
everywhere else, watches the app work, and lands in a space that is named, has
a note, and has a full stripe. If any part of that fails they are told, they
can leave at any moment, and their words are never lost.

## What is wrong now, and where it is fixed

| # | Finding | Fixed by |
| - | ------- | -------- |
| F1 | A model-written title is never checked for a free slug; two spaces can share one address | Step 1, Step 6, Step 9 |
| F2 | Every failure is silent, and a retry makes a duplicate space | Step 9 |
| F3 | No way out while the two model calls run; no timeout | Step 4, Step 9 |
| F4 | Pressing Create drops focus; progress is never announced | Step 5, Step 8 |
| F5 | The screen that asks for the most typing offers no typing help | Step 7 |
| F6 | Cancel discards the words without asking, and nothing is drafted | Step 11 |
| F7 | "Writing the first phrases…" runs even with no writing service | Step 8 |
| F8 | A skipped space is never asked again what it is for | Step 12 |
| F9 | The two model calls are sequential where they could overlap | Step 10 |

## Decisions

### D1 — The create screen is a Talk screen with no transcript

`NewSpaceScreen` takes the shape of `Talk` in `src/pages/talk.tsx`: a
`ScreenHeader`, a centre region where the transcript would be, and `Composer`
at the bottom. The centre region holds the question before the press and the
progress steps after it.

This is the directive, and it is also what makes the screen honest: the user is
writing a sentence into September, so it should look and work like every other
place they write a sentence into September.

The dock stays off. There is no current space to draw a tab for, and the
sidebar and Cancel are enough to leave with.

### D2 — The composer gets a third mode, `new`

`Composer` takes `mode: SpaceMode` today and switches three things on it: the
placeholder, the action button, and whether the audio selector shows.

`SpaceMode` is the *persisted* mode of a space — `spaceModeFrom`,
`rememberSpaceMode`, and `spaceParams` all read it — so a third value must not
go in it. Add instead, in `src/rules/spaces.ts`:

```ts
export type ComposerMode = SpaceMode | "new";
export function composerAction(mode: ComposerMode): { label: string; hint: string };
```

`talk` → Speak · `notes` → Add to note · `new` → Create space. The labels
become a rule a node test can read, which is where the repo keeps this kind of
thing. The audio selector stays bound to `talk` only.

### D3 — The composer's suggestions are framed for a description

On this screen there is no space context yet — writing it is the point. Without
one, the completion lane would answer as if the user were talking to somebody,
because `OPENING_PROMPT` and `COMPLETION_PROMPT` are written for a
conversation.

Pass a fixed framing line as the space context instead, kept in
`src/rules/spaces.ts`:

```ts
export const NEW_SPACE_CONTEXT =
  "I am describing a new space in my communication app: who I speak to here, and what we talk about.";
```

It reaches the model through `buildSuggestionPrompt`'s `spaceMd` slot, wrapped
in `<user_context>`, with the user's own style and personal words still in
`globalMd`. No new prompt, and the steer is testable at the prompt-builder
level.

**This is the one part of the plan that needs a running app to confirm.** See
R1.

### D4 — The stripe reads every space, because this space has none

`Suggestions` needs a `spaceId`. There is no space, so pass `""`: the
per-space phrase and message queries return nothing, and the code lookup —
which already reads every space — still works.

The history lane would then be empty too, which is a waste, because
`useAllMessages` exists in `src/services/data.ts` for exactly this reason: *the
words that the user writes with one person help the words that the user writes
with another.* Pass the user's recent messages from every space as the
composer's `history`. The lane has real content from the first space onwards.

### D5 — Progress is a rule, not a string in a button

Add to `src/rules/spaces.ts`:

```ts
export type StepState = "waiting" | "running" | "done" | "skipped" | "failed";
export interface CreateStep { id: "space" | "name" | "phrases"; label: string; state: StepState; note?: string }
export function createSteps(progress: CreateProgress): CreateStep[];
```

Three steps: **Making the space · Naming it · Writing the first phrases.** The
state machine handles two steps running at once (D6), a step skipped because no
writing service is connected (F7), a step that timed out, and a step that
failed. A node test reads all of it without a renderer.

The screen draws the steps in a `role="status" aria-live="polite"` region where
the transcript would be. That is the directive: the work is on the screen while
it runs, in words, and it is announced.

### D6 — The two model calls run together, both fed the user's words

Today `seedPhrases` waits for `describeSpace` so it can read the assembled
note. It does not need it. `decidePhraseSync` already treats a space context
with no messages as enough to seed from, and the model's appended note is
derived from the same words the user typed — it adds little to the phrase
prompt and costs the user the sum of two round-trips.

Run both from the typed words. Two concurrent `space_patch` calls are safe by
design: the backend merges per field with `COALESCE`, and
`apps/desktop/CLAUDE.md` already relies on that — *three writers change a space
and each one knows only its own fields.* `describeSpace` writes `title` and
`context`; `seedPhrases` writes `phrases_synced_count`. They do not overlap.

Roughly halves the wait.

### D7 — A model title must take a free slug, and a rename must be refused

`newSpaceTitle` guarantees a free title and then the model's title is patched
in with no such check. Split the check out as a rule both callers share:

```ts
export function freeTitle(candidate: string, existing: readonly (string | null | undefined)[]): string | null;
```

The two callers want different answers when the slug is taken:

- **The model's title** (`pages/spaces.tsx`) falls back silently to the
  auto name. The user never chose it, so there is nothing to tell them.
- **A rename** (`SpaceTitle` in `blocks/space.tsx`) must not silently change
  what the user typed. Keep their words in the field, do not navigate, and say
  so under the header: *Another space is already called Mum.*

### D8 — Cancel stays live, and leaving is never destructive

Cancel is enabled for the whole run. It aborts the model calls through the
`AbortSignal` that `generate` already accepts. What it does then depends on how
far the flow got:

- Nothing created yet → back to `/spaces`, after asking if the draft has words.
- The space exists → open it. The words are already in `space.context` by
  then, so there is nothing to lose and nothing to confirm.

Each model call also gets `MODEL_WAIT_MS` (20s, a rule constant). On a timeout
the step reads *Took too long — you can add this later* and the space opens
anyway.

### D9 — A retry continues; it does not create a second space

Hold the created space in a ref. A press of Create after a failure patches that
space rather than calling `space_put` again. The screen also offers **Open the
space anyway**, because after the first patch the user's words are already
saved and the rest is decoration.

### D10 — The draft survives a restart

`apps/desktop/CLAUDE.md` is decisive here: *Save a note without a Save button.
A user who types slowly must never lose words to a button they did not press.*
A paragraph typed by switch is worth more than a note, not less.

Keep the composer draft in a `new-space-draft` setting, written debounced,
cleared when the space is made or the draft is discarded. `openingPath` keeps
`/spaces/new` in `NEVER_OPENS` — the app still does not *open* on a form. It
offers the kept words when the user returns to it. This contradicts one
sentence in `docs/concepts/space-navigation.md`, which Step 13 rewrites.

## Steps

Each step writes its failing test first. Tests live in
`apps/desktop/tests/bootstrap.test.mjs` unless noted — rule tests import
`src/rules/*.ts` directly; screen tests read the source text, the style the file
already uses.

### Step 1 — `freeTitle`

- **Test:** `freeTitle("Mum", ["Mum"])` is `null`; `freeTitle("Mum", ["Dad"])`
  is `"Mum"`; the match is by slug, so `"mum"` and `"Mum"` collide; the
  existing `newSpaceTitle` tests still pass.
- **Change:** `src/rules/spaces.ts` — add `freeTitle`, and have `newSpaceTitle`
  use it so there is one definition of "free".

### Step 2 — the framing context

- **Test:** `buildSuggestionPrompt({ spaceMd: NEW_SPACE_CONTEXT, … })` puts the
  line inside the `<user_context>` block of the system prompt.
- **Change:** `src/rules/spaces.ts` — add `NEW_SPACE_CONTEXT`.

### Step 3 — the progress rule

- **Test:** three steps in order; with no writing service, steps 2 and 3 read
  `skipped` with a note naming the reason; while the models run, both read
  `running`; a failed step reads `failed` and does not leave the others
  `waiting`; when everything lands, all three read `done`.
- **Change:** `src/rules/spaces.ts` — add `StepState`, `CreateStep`,
  `CreateProgress`, `createSteps`, and `MODEL_WAIT_MS`.

### Step 4 — the services take a signal

- **Test:** source text of `services/ai.ts` and `services/phrase-sync.ts`
  passes `signal` through to `generate`.
- **Change:** `describeSpace(words, options?: { signal?: AbortSignal })` and
  `seedPhrases(space, options?: { signal?: AbortSignal })`, both passing it to
  the `generate` options that already carry one.

### Step 5 — the composer's third mode, and a button that keeps focus

- **Test:** `composerAction("new").label` is `"Create space"`; source text of
  `blocks/space.tsx` shows the action button using `aria-disabled` rather than
  the `disabled` attribute, and `AudioSelector` rendered only for `talk`.
- **Change:** `src/rules/spaces.ts` — `ComposerMode`, `composerAction`.
  `src/blocks/space.tsx` — `Composer` takes `ComposerMode`, reads its label and
  placeholder from the rule, and marks the action button `aria-disabled` with a
  no-op guard inside the handler instead of disabling it. A disabled element
  cannot hold focus, so the current code drops the user's place at the moment
  it asks them to wait. This also improves Talk, where Speak disables itself
  mid-send.

### Step 6 — `SpaceTitle` refuses a taken name

- **Test:** source text shows `SpaceTitle` calling `freeTitle` before it
  writes, and holding a message when the name is taken.
- **Change:** `src/blocks/space.tsx` — read `useSpaces()`, check the new title
  against every other space, and on a collision keep the words, skip the write,
  skip the navigation, and show the inline message from D7.

### Step 7 — rebuild the screen on the Talk shape

- **Test:** source text of `pages/spaces.tsx` renders `<Composer`, passes
  `mode="new"` and `NEW_SPACE_CONTEXT`, feeds `history` from `useAllMessages`,
  and holds no bare `<textarea`.
- **Change:** `src/pages/spaces.tsx` — rewrite `NewSpaceScreen` as D1
  describes. The question and its two lines of guidance sit in the centre
  region. Skip and Cancel sit with the question, not in the composer; Create is
  the composer's action button.

### Step 8 — visible, announced progress

- **Test:** source text holds `role="status"`; the rule tests from Step 3 cover
  the states. A separate assertion: with no writing service the screen says so
  *before* the press, not only in the steps.
- **Change:** `src/pages/spaces.tsx` — the centre region swaps the question for
  the step list once Create is pressed, drawn from `createSteps` inside a
  `role="status" aria-live="polite"` region. Under the composer, when no
  writing service is connected: *September will keep your words. Connect a
  writing service in Settings to have it name the space and write the first
  phrases.*

### Step 9 — errors, resume, and a live Cancel

- **Test:** source text shows a `catch` around the whole create path, a
  `<Problem` rendered from the held error, the created space kept in a ref, and
  Cancel with no `disabled` tied to the busy state.
- **Change:** `src/pages/spaces.tsx` —
  - catch every failure, hold it, render `<Problem>`;
  - keep the created space in a ref so a retry patches it (D9);
  - offer **Open the space anyway** once the words are saved;
  - one `AbortController` for the run, aborted by Cancel and by the
    `MODEL_WAIT_MS` timeout (D8);
  - run the model title through `freeTitle` before patching it (D7).

### Step 10 — the model calls run together

- **Test:** source text shows the two calls started together and settled
  together, with `seedPhrases` fed the typed words.
- **Change:** `src/pages/spaces.tsx` — `Promise.allSettled` over
  `describeSpace` and `seedPhrases`, each with its own timeout, each updating
  its own step.

### Step 11 — the draft survives, and Cancel asks

- **Test:** source text shows the draft written to and read from the setting,
  and cleared when the space is made; Cancel with words opens an `AlertDialog`
  whose confirming button is `destructive`.
- **Change:** `src/services/os.ts` — a `new-space-draft` setting.
  `src/pages/spaces.tsx` — restore it on mount, write it debounced, clear it on
  success and on a confirmed discard, and confirm before discarding.

### Step 12 — Skip gets asked again

- **Test:** source text of `pages/talk.tsx` shows the empty state offering
  About when the space has no context.
- **Change:** `src/pages/talk.tsx` — when there are no spoken messages and no
  `space.context`, the empty state carries one action: *Tell September what
  this space is for* → `/spaces/$slug/notes`, which opens the About tab. The
  recovery machinery already exists; `decidePhraseSync` seeds the phrases the
  moment a context appears. Only the invitation is missing.

### Step 13 — the docs

- `apps/desktop/README.md` — the composer on the create screen, the visible
  steps, the parallel calls, the kept draft, the collision rule.
- `docs/concepts/space-navigation.md` — the desktop section. The sentence *the
  app never opens on this address, because the words of a form do not survive a
  restart* becomes: the app still never opens on it, and the words are kept and
  offered back.
- `docs/concepts/saved-phrases.md` — seeding now runs from the typed words, not
  the assembled note.
- `apps/desktop/CLAUDE.md` — note that `/spaces/new` writes through `Composer`
  too, so the one-console rule holds with no exception.
- `docs/notes/2026-08-23-new-space-flow.md` — the running note for this plan,
  recording only what the plan does not say.

## What does not change

- The route. `/spaces/new` stays, and no space exists at it until the user acts.
- `openingPath` keeps `/spaces/new` in `NEVER_OPENS`.
- Id-free slugs.
- The three-word names, and `isAutoTitle` reading them back out of a slug.
- The model's note goes *under* the user's words, after a blank line, and never
  over them.
- The starter pack on the first space.
- Skip stays: it creates and opens at once, and waits for no model.

## Verification

```sh
pnpm -C apps/desktop test      # node --test
pnpm -C apps/desktop build     # tsc --noEmit && vite build
pnpm -C apps/desktop tauri:dev # walk the flow
```

By hand, and all of it on the 1376×1032 baseline:

1. With a writing service connected: type an answer using only the stripe and
   the tiles, press Create, and watch the three steps. Confirm the space opens
   named, with a note and a full stripe.
2. With `writingService: "none"`: confirm the line under the composer appears
   before the press, and the two model steps read *Skipped*.
3. Press Cancel while the models run. Confirm it responds, and lands somewhere
   sensible.
4. Kill the app mid-draft, reopen it, go to `/spaces/new`, and confirm the words
   are offered back — and that the app opened on the dashboard, not the form.
5. Keyboard only: Tab to Create, press Enter, and confirm focus is not lost and
   the step changes are announced.
6. Make a space whose model title collides with an existing one. Confirm the
   new space keeps its auto name and both spaces stay reachable.

## Risks

- **R1 — The suggestion prompts are written for conversation, not description.**
  D3 steers them with a framing context, which may not be enough: the lane could
  still offer things to *say* rather than ways to *describe*. This must be
  judged in a running app, not in a test. If it does not steer, the fallback is
  a third prompt beside `OPENING_PROMPT` and `COMPLETION_PROMPT` in
  `src/rules/prompts.ts`, selected by the composer mode. Budget for it.
- **R2 — `spaceId=""` through the stripe.** `usePhrases("")` and
  `useMessages("")` should return empty rather than error, and
  `suggestionsFor(engine, draft, "")` should treat the id as an unknown lane.
  Confirm before building on it; if `""` is awkward, the alternative is making
  `Suggestions` accept an optional `spaceId`.
- **R3 — Concurrent `space_patch`.** Safe by the `COALESCE` design, but it has
  not been exercised concurrently. Add a Rust test in
  `src-tauri/tests/` that patches two disjoint field sets at once and asserts
  neither is lost.
- **R4 — `aria-disabled` on the composer action reaches Talk and Notes.**
  Behaviour must not change: a press with an empty draft, or during a send,
  still does nothing. Worth a careful look at the Speak path, where a double
  press must not send twice.
- **R5 — Scope.** Steps 1–10 are the flow. Steps 11 and 12 stand alone and can
  land separately if this gets long, but F6 and F8 stay open until they do.
