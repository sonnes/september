---
title: Desktop saved phrases and suggestion stripes
description: How to port the saved phrases, the phrase codes, and the suggestion stripes into the independent desktop app, in three parts.
status: plan, not approved
---

# Desktop saved phrases and suggestion stripes

This is phase 3 of [the spaces and Talk plan](2026-08-21-desktop-spaces-talk.md).
It is the largest of the four phases, so it comes in three parts. Each part
gives the user something on its own.

## Goal

Bring the signature interaction of September to the desktop app: the user
presses a word in a row of ready sentences, and the sentence goes into the
composer. Fewer keystrokes to full expression.

## What ports without a change

The rules of this feature are pure functions. They import types only, so they
move into the desktop app as they are.

| File in `apps/web/src`                | Lines | What it holds                                |
| ------------------------------------- | ----- | -------------------------------------------- |
| `packages/suggestions/lib/stripes.ts` | 156   | Tokens, the hidden prefix, and the merge      |
| `packages/spaces/lib/codes.ts`        | 184   | Short codes, and the word at the caret        |
| `packages/spaces/lib/phrases.ts`      | 172   | Pinned rows, starters, and the regen decision |
| `packages/spaces/lib/mine.ts`         | 200   | Shortcut ideas from repeated messages         |
| `packages/suggestions/lib/context.ts` | 131   | The two prompts                               |
| `packages/suggestions/lib/reanchor.ts`| 63    | Steady rows while the user types              |

About 930 lines of rules, with about 1180 lines of tests beside them. Both move
together. This is the cheapest part of the work, and the part that must not be
rewritten.

They land in `src/phrases.ts` and `src/stripes.ts`, beside `src/spaces.ts`.

## What must be built again

| Part                | Why it cannot move                                        |
| ------------------- | ---------------------------------------------------------- |
| The stripe tiles    | The web tiles use `@chenglou/pretext` to measure text.      |
| The stripe hook     | It reads web collections and the web editor context.        |
| The seed and regen  | It writes through the web mutation layer.                   |
| The Phrases surface | It lives in the right rail, which the desktop app has not.  |

## What the desktop app drops

- **`@chenglou/pretext`.** The web app measures the longest row and scales
  every tile by one factor. The desktop app starts with a size that comes from
  the length of the longest row, in CSS. Add the measuring engine when the
  simple rule looks wrong on a real sentence.
- **The editor context provider.** The Talk screen already holds the text of
  the composer. The stripes take `text` and `onTake` as properties.
- **The account context.** The desktop app has no account. The prompt uses the
  context of the space, and the speaking style and personal words that setup
  already keeps.
- **The word autocomplete.** The web app completes the word at the caret from a
  second source. It belongs with the composer, not with this port.

## Storage

Schema version 5 adds one table:

```sql
CREATE TABLE IF NOT EXISTS saved_phrases (
  id TEXT PRIMARY KEY NOT NULL,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  kind TEXT NOT NULL,          -- 'phrase' or 'starter'
  code TEXT,                   -- lowercase, 2 to 5 letters
  pinned INTEGER NOT NULL,     -- 1 when the user keeps it
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;
```

| Command         | Request                | Response        |
| --------------- | ---------------------- | --------------- |
| `phrase_list`   | `{ space_id? }`        | `SavedPhrase[]` |
| `phrase_put`    | `SavedPhrase`          | `SavedPhrase`   |
| `phrase_delete` | `{ id }`               | `boolean`       |

`phrase_list` without a space returns every row, because a code works in every
space. Deleting a space deletes its phrases.

The one rule that the storage must hold: **a regeneration rewrites only the
rows that are not pinned.** A phrase that the user keeps is never moved or
lost. `phrase_put` alone cannot promise that, so `src/data.ts` writes the
replacement as one list, and Rust erases only the rows with `pinned = 0`.
That needs a fourth command, `phrase_replace_ai`.

## The writing service

The stripes need text from a model for their last rows. The desktop app has
`apfel_generate` for the local model. OpenRouter needs a command of the same
shape, because its key stays in Rust.

`src/ai.ts` reads the `services` setting, picks the service, and gives the app
one `generate()`. A user with no writing service still sees the phrases, the
starters, the codes, and the history rows. That is a complete surface, and it
is the surface that a user in privacy mode sees.

## The parts

### Part A — Phrases, codes, and the stripe, with no model

The table, the three commands, the pure rules, and the stripe row in the
composer. The rows come from the saved phrases, the sentence starters, the past
messages of the space, and a code at the caret.

A new space seeds the starter pack that the web app seeds: `ty` for thank you,
`iwb` for the bathroom, and `hru` for how are you.

This part alone removes keystrokes, and it works with no account and no
network.

Size: about a day and a half.

### Part B — The model writes phrases and completions

`openrouter_generate`, `src/ai.ts`, the seed and the regeneration of the rows
that are not pinned, and the last stripe rows from the model.

`decidePhraseSync` already owns when to regenerate: after six new messages.
The desktop app keeps that number.

Size: about a day.

### Part C — The Phrases screen and shortcut ideas

A screen to see the phrases of a space, pin one, give it a code, and remove it.
Below them, the shortcut ideas from `mineShortcuts`, with the evidence that
found them ("Typed 9 times"). Keep adds the phrase with its code. Dismiss
writes to a setting, not to the browser storage.

The web app puts this in a right rail. The desktop app has no rail, so the
phrases of a space belong on the Talk screen, behind a button in the header.

Size: about a day.

## Risks

- **The stripe is the hardest thing to get right by eye.** The tiles must stay
  on one line and stay large enough to press. Part A must end with a real
  screenshot at 1376 px, with a long sentence in the row.
- **A code must never take a word that the user typed on purpose.** The common
  word list in `codes.ts` prevents it. Port the list and its tests together.
- **Apple Intelligence is not on every Mac.** Part B must degrade to Part A,
  not to an error.
