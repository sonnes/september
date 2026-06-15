---
title: Saved phrases
description: Per-space ready-to-use phrases — AI-seeded, periodically regenerated, with user-pinned phrases that survive regeneration.
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

## Lifecycle

1. **Seed** — on the first message, `useSyncSpacePhrases` generates the initial
   AI set from that message and the space context. (Spaces created before this
   feature backfill the same way the next time they're opened.)
2. **Regenerate on open** — when a space is reopened and its history has grown
   stale (`isStale` / `PHRASES_STALE_AFTER` new messages since the last sync),
   the AI set is regenerated from recent history + context. Pinned rows stay.
3. **Keep / promote** — pinning an AI phrase (the tab's "keep" action, or the
   suggestion stripe's pin button) flips it to `pinned: true` via
   `addManualPhrase`, locking it in against future regeneration.

`Space.phrases_synced_count` records the message count at the last generation,
driving the staleness check.

## Generation

`useGenerateSpacePhrases` mirrors `useGenerateSpaceContext`: it uses the
suggestions provider/model and runs only when the provider is ready. The prompt
(`buildPhrasesPrompt`) embeds the **full current collection** (pinned + AI) so
the model refines the set and avoids re-proposing near-duplicates, rather than
re-deriving blindly. `replaceAiPhrases` then deletes the old AI rows and inserts
the fresh ones, with `dedupeAgainstPinned` keeping them clear of pinned phrases.

## Surfaces

- **Phrases tab** (right panel) — view all phrases (pinned first, then AI),
  add/remove, keep/unpin. Tapping a phrase inserts it into the composer.
- **Suggestion stripe** — shows the top 5 (`topPhrases`, pinned first) as its
  curated default, replacing the old "parse bullets from `space.context`"
  behavior. `space.context` remains the LLM persona/steering document.
