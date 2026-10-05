---
title: Notes — create the space first
plan: ../plans/2026-09-06-space-creation-flow.md
---

# Notes

What the plan does not say, and what a reviewer should know.

## The rename rule got stricter than the plan described

The plan had `spaceForSlug` follow a rename by remembering the id of the space
a screen was showing. That alone confuses two different things: a space being
renamed under a still address, and the user following a stale link from inside
another space. Both leave a slug that names nothing while a remembered space
still exists.

So the screen remembers the id **and** the address it found it at, and follows
a rename only while the address stands still. A changed address that names no
space is a stale link, and still goes back to the list.

## Opening the space needed the list to know about it

`useNewSpace` navigates as soon as `createSpace` resolves, and that was not
enough. `useCreateSpace` asks for the space list again in `onSuccess` but does
not wait for the answer, so the destination read a list written before the
space existed, found no space at that slug, and `useSpaceBySlug` sent the user
straight back to the list. A new space is exactly the space a held list is
oldest about.

Two changes, because either alone leaves a hole:

- `useNewSpace` puts the created space into the `["spaces"]` cache before it
  navigates, so the destination resolves without waiting on a read. The
  invalidation that follows sorts the list out. It is written by id, so a list
  that already has the space is left alone.
- `useSpaceBySlug` does not call a space gone while the list is being read.
  `isPending` is false whenever a cached list exists, which is every time but
  the first, so a refetch in flight has to count too.

The starter phrases that `useCreateSpace` seeds for a first space are part of
the create write, so a press is still one await.

## The setup turn is one call, not three

The deleted screen wrote the user's turn itself and then called
`continueAgent`, because the screen that collected the words was not the screen
that showed the answer. Now it is one screen, so the first send is an ordinary
`askAgent` carrying `intro` and the introduction's longer signal. The context
patch is still awaited first, so the words are on disk before any model reads
them, and `inspect_space` sees them.

That left `continueAgent` and `writeAgentMessage` in both apps' agent services
with no callers, and they are gone. `agentSaidRow` stays in core: it is the
tested rule for writing one plain transcript row, and the resolve path and its
tests still read it.

## What the first message looked like, and what it looks like now

Two things were wrong with the very first message in a new space, both found by
mounting the screen and pressing the button:

- **Nothing said the turn was running.** `Transcript` is where this screen
  draws "Working…" and the streaming answer, and it was only drawn once the
  transcript held a row. The rows are only refetched when the turn ends, so a
  first message left the empty state on screen, unchanged, for the length of a
  setup turn — a chain of model calls that writes a name, a description and up
  to nine phrases. The press looked like it had gone nowhere. The transcript is
  now drawn as soon as a turn is in flight, rows or no rows.
- **The console changed under the user mid-turn.** The description is written
  to the space before the model is asked, so `spaceNeedsSetup` went false while
  the turn setting the space up was still running: the question became "What
  shall we change?", the button became "Ask", and the suggestion stripe
  disappeared. A `settingUp` flag now holds the setup console until the turn
  ends. `needsSetup` still decides what actually happens; `setup` only decides
  what is drawn.

`apps/web/src/space-setup.test.tsx` mounts the real Agent screen for a new
space and covers all three: the question it opens on, that work is visible
while the turn runs, and that the console it started in is the one it ends in.

Still true, and not a defect: the user's own words stay in the composer until
the turn ends rather than appearing in the transcript. That is how every turn
behaves — the draft is the question until there is a stored row to replace it —
and the words are visible the whole time. What the agent *does* mid-turn (the
tool rows) still only lands when the turn ends, because nothing refetches the
transcript until then.

## The default name is `Untitled`

The made-up three-word names (`Amber Cedar Meadow`) and the `General` first
space are gone. A space is now `Untitled`, and `Untitled 1`, `Untitled 2` after
it — numbered from the names that are free, so a deleted space gives its number
back. The name is carried for the few seconds before the agent writes a real
one, and it should promise nothing.

That removed the only reader of the word list, and with it `isAutoTitle`, which
recognised a made-up name by reading its words back out of a slug. It already
had no callers — the introduction prompt decides what to rename, and `freeTitle`
guards the collisions — so it went with the words it needed. Say the word if it
was being kept for something.

## Kept on purpose

- **`new-space-draft`.** The setting and the `newSpaceDraft` backup field stay.
  A version 2 backup carries them, and dropping a field from a versioned format
  would only break restores. Nothing reads it now; the `os.ts` helpers that did
  are gone.
- **`NEVER_OPENS`.** `/spaces/new` is no longer a route, but `openingPath`
  still refuses it: a saved address written by an older install starts with
  `/spaces/`, so the general rule would happily open a route that is gone.
- **A press always makes a space.** Two presses make two spaces. An untouched
  one is deleted from the list.

## A refused call crashed the space it was refused in

The setup turn called `change_phrase` with `pinned` as a string, and the
executor refused it — correctly; the schema declares a boolean and the refusal
goes back to the model to retry. But the refused call is stored with the
arguments the model sent, and the transcript described that row by validating
those arguments again: `agentToolSummary`, `agentProposalLines`, and
`proposalIcon` all threw during render, so the router's error boundary replaced
the whole screen with *Something went wrong! · pinned must be true or false.*
The row is durable, so every later visit to that space crashed the same way.

`agentCallInput` is the fix: describing a row validates when it can and reads
the raw object when it cannot, and never throws. `callOperation` already
documented exactly this policy — it just was not the one the drawing code used.
The executor is untouched.

`agentCallNeedsApproval` stays strict on purpose. Reading the operation
leniently would turn a malformed delete into a card the user could approve and
that would then fail; refusing it outright gives the model a reason it can act
on.

## `useAllMessages` takes an argument now

The Agent screen reads every message the user has written, but only to fill the
suggestion stripe while a space is being set up. Both apps' `useAllMessages`
gained an `enabled` flag rather than read every row of every space each time
anyone opens Agent.

## One dependency that was missing before this work

`pnpm -C apps/desktop build` failed on `src/eye-tracker.tsx`: `lucide-react` is
imported there but was never declared in `apps/desktop/package.json`, so the
desktop build broke the moment the workspace was installed cleanly. It failed
the same way on an unchanged tree. Declared at `^0.556.0`, the version the web
app and `app-ui` already resolve to; the lockfile change is three lines.

Everything now verifies: core, web, and desktop tests, web lint, and both
builds.
