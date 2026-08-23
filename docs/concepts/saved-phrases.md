---
title: Saved phrases
description: Per-space ready-to-use phrases and sentence starters — AI-seeded, periodically regenerated, with user-pinned rows that survive regeneration and optional short codes that surface a phrase while typing.
package: spaces
---

# Saved phrases

Each Space keeps a short list of ready-to-use phrases so the user reaches full
expression in one tap instead of many keystrokes. Phrases are stored as one row
per phrase in `savedPhraseCollection` (IndexedDB `app-saved-phrases`).

## The `pinned` flag

A single flag carries the AI/manual distinction:

| `pinned` | Meaning | Lifecycle |
| --- | --- | --- |
| `true` | The user kept it — added manually or pinned a suggestion | Durable. Never touched by regeneration. |
| `false` | AI-generated | Replaced wholesale on each regeneration. |

This is the core invariant: **regeneration only ever rewrites `pinned: false`
rows.** A pinned phrase the user depends on ("Please call the nurse") is never
overwritten, reordered, or dropped by the AI.

## Kinds: phrases and starters

`kind` distinguishes two row types sharing the same lifecycle:

- **`phrase`** (default; absent on rows persisted before the field existed) —
  a complete, speakable thought. Renders as a normal stripe row with the speak
  `↵` key.
- **`starter`** — a 3–5-word sentence-opening prefix ("Can you please check").
  Renders as a dashed stripe row whose `…` key takes the prefix into the
  composer; completion continues from there. Starters are generated alongside
  phrases in the same structured call and clamped in code (`sanitizeStarters`).

## Codes (shortcuts)

`code` is an optional short abbreviation (2–5 chars, stored lowercase) that
surfaces its phrase at the top of the suggestion stripe while typing: type
`ty`, the "Thank you" row appears first, one tap swaps the typed code for the
phrase (the stripe's take path consumes the trigger via `codeExpansionText`).

- **User code ⇒ pinned.** Setting a code (`setPhraseCode`, or the Phrases tab)
  pins the row — a code the user relies on must survive regeneration.
- **AI codes are ephemeral.** Seeding/regen assigns each AI phrase a code too,
  generated deterministically client-side (`generateCode` — content-word
  initials, mutated on collision), never by the LLM. They are replaced with
  their rows on the next regen; pinning the phrase makes its code durable.
- Codes are unique app-wide, checked against a built-in common-word list
  (`isCommonWord`) so a code never collides with a word the user would type
  literally. Lookup is cross-space (`matchCode`); the current space wins
  conflicts.
- The first-run General space seeds a starter pack: `ty` → Thank you,
  `iwb` → I want to go to the bathroom, `hru` → How are you?.

## Shortcut mining

`mineShortcuts` proposes phrase+code pairs from the space's recent messages —
pure local counting, no LLM, works in privacy mode. Repeated full messages and
repeated 3–8-word sub-phrases (with independent support) are ranked by
recency-decayed frequency × keystrokes saved; candidates matching any existing
phrase (pinned or AI-seeded) are excluded. The Phrases tab shows the top
proposals as **Shortcut ideas** with the evidence ("Typed 9×"); Keep pins the
phrase with its code in one tap, Dismiss persists to `localStorage`
(`september:mined-dismissed`) and never re-proposes.

## Lifecycle

1. **Starter default** — `createDefaultSpace` gives a new user a `General`
   space with starter saved phrases (including the coded starter pack) before
   they have typed anything.
2. **Seed** — on the first message, `useSyncSpacePhrases` generates the initial
   AI set (phrases + starters) from that message and the space context,
   replacing starter AI rows while preserving pinned rows. (Spaces created
   before this feature backfill the same way the next time they're opened.)
   In the desktop app a space context alone is enough: `decidePhraseSync` seeds
   when `hasContext` is true. The "what is this space for?" screen calls
   `seedPhrases` itself and waits for it, so a new space opens with a full
   stripe instead of one that fills a moment later. It seeds from the words the
   user typed, not from the note the title model writes, so the two model calls
   run beside each other rather than one after the other — the words alone are
   what `hasContext` already treats as enough. `useSyncPhrases` covers a space
   that reaches Talk without phrases.
3. **Regenerate on open** — when a space is reopened and its history has grown
   stale (`decidePhraseSync` / `PHRASES_STALE_AFTER` new messages since the last
   sync), the AI set is regenerated from recent history + context. Pinned rows
   stay.
4. **Keep / promote** — pinning an AI phrase (the tab's "keep" action, or the
   suggestion stripe's pin button) flips it to `pinned: true` via
   `addManualPhrase`, locking it — and its code — in against future
   regeneration.

`Space.phrases_synced_count` records the message count at the last generation,
driving the staleness check. A generation that returns no usable rows leaves
the count alone, so the next message tries again instead of waiting for six.

## Generation

`useGenerateSpacePhrases` mirrors `useGenerateSpaceContext`: it uses the
suggestions provider/model and runs only when the provider is ready. The prompt
(`buildPhrasesPrompt`) embeds the **full current collection** (pinned + AI,
phrases + starters) so the model refines the set rather than re-deriving
blindly: pinned rows carry a `[pinned]` marker and the model is told those are
kept automatically and must not be returned, while unmarked rows are the ones
its output replaces. History is embedded as labeled conversation lines
(`formatPhraseHistory` — `Me:` for the user, `Them:` for transcriptions) so the
other person's speech is never attributed to the user. `replaceAiPhrases` then
deletes the old AI rows (both kinds), inserts the fresh ones with
auto-generated codes on phrases, and `dedupeAgainstPinned` (per kind) keeps
them clear of pinned rows.

## Surfaces

- **Phrases tab** (right panel) — view all phrases (pinned first, then AI),
  add/remove, keep/unpin, set/edit codes (with dictionary/duplicate conflict
  warnings), and act on mined Shortcut ideas. Tapping a phrase inserts it into
  the composer.
- **Suggestion stripe** — the curated default mixes top phrase rows with up to
  2 starter rows in a 5-row budget (`topPhrases` / `topRows`, pinned first).
  A typed code pins its phrase's row to the top. `space.context` remains the
  LLM persona/steering document.
