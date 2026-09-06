---
title: Create the space first, set it up inside it
description: The new-space screen goes away. A space exists the moment the user asks for one, and it is set up in its own Agent conversation.
---

# Create the space first, set it up inside it

## Today

`+ New space` opens `/spaces/new`, a screen where no space exists. The user
describes the space, and only then is it created: its words become its
context, an introduction turn starts, and the address changes to the new
space's Agent.

## After

`+ New space` creates an empty space at once and opens it. When a writing
service is configured it opens in Agent, and the space's own agent sets it up
from what the user says there. When none is configured it opens in Talk.
`/spaces/new` no longer exists.

## 1. Core rules — `packages/core/rules/spaces.ts`

- `spaceNeedsSetup(space, agentRows)` — true when a space has no context and
  its Agent transcript is empty. It is what makes Agent ask what the space is
  for, and what makes the first turn run under the introduction prompt.
- `newSpaceMode(hasWriting)` → `"agent" | "talk"`.
- `spaceForSlug(slug, spaces, seenId)` → the space, a rename to follow, or
  nothing. Required, not extra: the setup turn calls `configure_space`, which
  renames the space and changes its slug, and every space screen resolves its
  space by slug. Without this the user is thrown out of the space mid-setup.
- `ComposerMode` `"new"` → `"setup"`: label `Set up space`, field
  `What is this space for?`, same placeholder. It is no longer a screen with
  no space to write into — it is a real, empty space.
- Delete `MODEL_WAIT_MS`, which nothing reads.

## 2. Shared UI — `packages/app-ui/blocks/space.tsx`

- `useNewSpace()` — creates with `newSpaceTitle`, then opens
  `spaceParams(space, newSpaceMode(hasWritingService()))`. The space list and
  the dock both call it, so the two presses behave the same. Every press makes
  a space; an untouched one is deleted from the list.
- `useSpaceBySlug(slug, mode)` — resolves through `spaceForSlug`, replaces the
  address when the space was renamed, and falls back to `/spaces` when it is
  really gone. It replaces the same effect written three times.

## 3. `packages/app-ui/pages/agent.tsx`

Delete `NewSpaceScreen` and `introduce`. The Agent screen gains a setup state
when `spaceNeedsSetup`:

- the empty state asks *What is this space for?* with `NEW_SPACE_OPENERS`;
- the composer runs in `setup` mode with the suggestion stripe on, reading
  `NEW_SPACE_CONTEXT` and the user's messages from every other space, because
  that stripe is the keystroke saving the deleted screen offered;
- the first send patches the space's context with the user's exact words, then
  runs `askAgent(space, text, { intro: true, signal: INTRODUCTION_WAIT_MS })`.
  One call, streaming into the screen the user is already looking at.

## 4. Talk and Notes

Both switch to `useSpaceBySlug`. Talk is otherwise unchanged: a new space with
no writing service opens as an ordinary empty Talk screen.

## 5. Both apps

| | web | desktop |
| --- | --- | --- |
| Route | drop `/spaces/new` from `router.tsx` and `APP_ROUTE_PATHS` | drop `newSpaceRoute` from `main.tsx` |
| Nav rules | keep `NEVER_OPENS`, so a path saved by an older install cannot open a route that is gone | the same, and drop the `windowTitle` branch |
| Services | drop `newSpaceDraft` and `rememberDraft` from `os.ts` | the same |

The `new-space-draft` setting and the `newSpaceDraft` backup field stay. A
version 2 backup carries them, and dropping a field from a versioned format
buys nothing.

## 6. Tests

Core covers the four rules. Web updates `router.test.ts` and
`rules/analytics.test.ts`, and adds a test that a press creates a space and
opens Agent with a service configured and Talk without, and that a rename
keeps the user inside the space. Desktop keeps its `openingPath` case for the
old path.

## 7. Docs

`docs/concepts/space-navigation.md`, `docs/concepts/space-agent.md`,
`apps/desktop/README.md`, `packages/app-ui/README.md`,
`packages/core/README.md`, and a running note beside this plan.
