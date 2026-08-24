---
title: Saved phrases
description: Each space keeps phrases and sentence starters that reduce the number of required keystrokes.
package: desktop, web
---

# Saved phrases

Each space keeps ready-to-use phrases and sentence starters. The desktop and web apps use the same row shape and interaction rules.

The desktop app stores rows in SQLite. The web app stores rows in the `saved_phrases` IndexedDB store.

## Pinned rows

The `pinned` field controls the lifecycle:

| Value | Meaning | Lifecycle |
| --- | --- | --- |
| `true` | The user kept or added the row | Generation never removes it |
| `false` | A writing service generated the row | The next generation can replace it |

Phrase replacement uses one transaction. It removes only unpinned rows from the selected space.

## Kinds

The `kind` field is `phrase` or `starter`.

A phrase is a complete thought. A starter is a short sentence opening that moves into the composer.

## Codes

A code is a 2–5 character shortcut. For example, `ty` can expand to “Thank you.”

Codes are lowercase and unique in the current phrase set. The code rules reject common words to prevent an accidental expansion.

A user-set code pins its row. Generated codes remain unpinned until the user keeps the phrase.

## Suggestions

The right panel shows pinned rows before generated rows. The Talk stripe combines phrases, starters, message history, and autocomplete words.

The app learns shortcut ideas from repeated messages. Dismissed ideas stay in the application settings.

## Generation

OpenRouter can generate phrases from the space context and recent messages. A generation call runs only when the user connected that service.

`Space.phrases_synced_count` records the message count of the last successful generation. A failed generation keeps the prior rows and count.
