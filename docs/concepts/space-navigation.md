---
title: Space-first navigation
description: A space is the navigation unit for Talk, Notes, phrases, and the remembered mode.
package: desktop, web
---

# Space-first navigation

A user first selects a space. Then the user works in Talk or Notes inside that space.

The desktop and web apps use these routes:

```text
/spaces
/spaces/new
/spaces/$slug/talk
/spaces/$slug/notes
/spaces/$slug/notes/$noteSlug
```

The route slug comes from the space title. The app resolves the slug against the loaded spaces.

## Remembered mode

Each space remembers its last mode by slug. The space list opens Talk or Notes from this saved value.

The setting name is `space-modes`. SQLite stores it on desktop. The `settings` IndexedDB store keeps it on the web.

## New space

`/spaces/new` asks what the space is for. No space exists at this route.

The screen uses the same composer and suggestion stripe as Talk. The app keeps an unfinished draft in the `new-space-draft` setting.

OpenRouter can write a title, context, and initial phrases. These calls run only when the user connected OpenRouter.

## Space screen

The header switches between Talk and Notes. A space dock gives access to other spaces and the new-space route.

The right rail has Phrases and Voice tabs. It expands to a 320px panel on large screens.

The `panel-open` setting stores the active tab and open state. The desktop and web apps use the same panel rules.
