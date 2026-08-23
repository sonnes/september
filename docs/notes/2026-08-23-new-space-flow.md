---
title: The new space flow — implementation notes
description: Decisions made where the plan was silent, and deviations from it.
plan: ../plans/2026-08-23-new-space-flow.md
---

# The new space flow — implementation notes

Only what the plan does not say.

## Deviations

### D4 is wrong: an empty space id does not reach SQLite

The plan says to pass `spaceId=""` through `Suggestions` and let the per-space
queries come back empty. They do not. `validate_identifier` in
`src-tauri/src/repository.rs` rejects an empty string, so `phrase_list` and
`message_list` would both fail with *phrase space ID must contain 1 to 256
bytes*, and the stripe would carry that error instead of words.

R2 named the alternative, and it is the one taken: `usePhrases` and
`useMessages` in `src/services/data.ts` treat the empty id as *no rows*, and do
not query at all. `usePhrases()` with no argument still means every phrase, so
the three cases stay distinct:

| Argument      | Means            |
| ------------- | ---------------- |
| `undefined`   | every phrase     |
| `""`          | no rows, no call |
| a real id     | that space       |

`suggestionsFor` in the autocomplete engine already takes an optional space id,
so the word lane needs nothing: the create screen passes `undefined` and the
engine treats it as an unknown lane.

### The focus fix reached the whole console, not just Create

The plan named the primary button (F4). The other three controls drop focus the
same way: Undo, Delete last word, and Clear all disable themselves the moment
the draft empties, which is exactly when a user is pressing them repeatedly.
All four say `aria-disabled` now and guard their own handler. This reaches Talk
and Notes too, and `act` gained a `pending` guard so a second press cannot send
twice.

### About opens itself for a space with no note

Step 12 says the Talk invitation should land on About, but About was state
inside the Notes screen with no address, so navigating to `/spaces/$slug/notes`
would have opened a note beside it. `about` now starts true when the address
names no note **and** the space has no context. A deep link to a note still
wins. The cost: a space with notes but no About also opens on About. That is
the state a skipped space is in, so it is the right default, and the tab strip
is one press away.

## Decisions the plan left open

- **`useSuggestions` takes an optional space id.** `suggestionsFor` already
  did; the service did not. The create screen names no lane rather than naming
  the empty one.
- **The composer's action is a rule, not a prop.** `composerAction(mode)` holds
  the label, the field name, the placeholder, and whether the mode makes a
  sound. The icon stays in `space.tsx`, because a rules module draws nothing.
- **A model failure is a step note, not an error.** `Promise.allSettled` keeps
  the two model calls out of the catch: by the time they run, the space exists
  and the words are saved, so a model that did not answer is worth a line
  beside its step and nothing more. Only a storage failure raises `Problem`.
- **The draft is written debounced at 400ms** and cleared when the space opens
  or the user confirms a discard.

## Verification

R3 is covered by `the_phrase_count_can_land_before_the_name` in
`src-tauri/src/repository.rs`. The existing
`one_writer_of_a_space_never_undoes_another` only ever saw the count land last;
the parallel calls make either order possible, and both hold.

R1 is **not** settled. `NEW_SPACE_CONTEXT` steers the suggestion prompts by
standing in for the space context, and the prompt-builder test proves it
reaches the `<user_context>` block — but whether the completions read as ways
to describe a space rather than things to say to somebody can only be judged in
a running app. If it does not steer, the fallback is a third prompt in
`src/rules/prompts.ts` chosen by the composer mode.

## A known gap

A model step that fails sets its note, and then the screen opens the space
anyway — so the note is written and never read. That is deliberate: the user
pressed Create to get a space, and holding them in front of a failure notice to
acknowledge it would be its own harm.

The two failures are not equal, though. A failed `seedPhrases` heals itself:
`decidePhraseSync` sees a context with no messages and seeds again on the first
message. A failed `describeSpace` does not. The space keeps its made-up name
for good, because Talk asks no model — `/spaces/new` already asked — and
nothing else renames a space on the desktop. The user can rename it in the
header, but nothing tells them why it is called `Amber Cedar Meadow`.

Worth a decision later: either carry the failure into the space it made (a line
in the Talk empty state, the way the skipped-space invitation works), or let
`useSyncPhrases` grow a sibling that renames an auto-titled space once it has
messages. Neither is in this plan.

## After the plan: the placeholder and the openers

The placeholder was an example sentence. It now says what to write — *Say who
you speak to here, and what you talk about* — and the paragraph above the
console dropped the same instruction so the screen does not say one thing
twice. Heading asks, placeholder says what, paragraph says why.

The examples came back as `NEW_SPACE_OPENERS`, which is where they were always
worth more: an example you can press costs no keystrokes, one you must retype
costs all of them.

They are drawn by `Composer`, not beside it, and that is the whole reason the
design works. `write()` already pushes the undo stack and puts the focus back
in the field, so an opener is undoable and the row can disappear — which it
does, the moment the field has words — without taking the focus with it. A row
of buttons bolted on outside the console would have dropped focus on press, the
same bug this plan just fixed in four other places.

### The openers moved out of the console

They were drawn by `Composer` so a press could use `write()` — undo, and the
focus put back in the field. They now sit with the question, above Skip, which
reads better: a way in for a user who does not know what to write, beside the
way out for a user with nothing to say.

The focus problem that placement solved is solved differently. The row no
longer hides once the field has words — it stays as long as the question does —
so nothing unmounts under the press. What is lost is undo: a press is no longer
on the composer's undo stack, because that stack is internal to `Composer`.
Clear is one press away and 44px, so the recovery is cheap; exposing an insert
handle on a block that Talk and Notes also use was not worth it for that.

A press now appends rather than replaces, which turned out to be the better
rule anyway: the second press starts the second sentence.

### No example names a person

`- I speak to my sister here` in the About placeholder is gone, along with the
one on the new-space screen. Both say what to write instead. September does not
know who the user speaks to, and an example that guesses reads as though it
did. A test asserts `sister` never returns to `notes.tsx`.
