---
title: Space-first navigation
description: A space is the navigation unit for Talk, Notes, Agent, phrases, and the remembered mode.
package: desktop, web
---

# Space-first navigation

A user first selects a space. Then the user works in Talk, Notes, or Agent inside that space.

The desktop and web apps use these routes:

```text
/spaces
/spaces/$slug/talk
/spaces/$slug/agent
/spaces/$slug/notes
/spaces/$slug/notes/$noteSlug
```

The route slug comes from the space title. The app resolves the slug against the loaded spaces.

## Remembered mode

Each space remembers its last mode by slug. The space list opens Talk, Notes,
or Agent from this saved value.

The setting name is `space-modes`. SQLite stores it on desktop. The `settings` IndexedDB store keeps it on the web.

## New space

A new space has no route of its own. The press makes the space and opens it: in
Agent when a writing service is configured, and in Talk when none is.

A space with no description and an empty Agent transcript has still to be set
up. Its Agent asks what it is for, with the same composer and suggestion stripe
as Talk, and its first turn writes the title, the context, and the first
phrases. Those calls run only when the user connected a writing service.

A title is an address, so that first turn moves the space. The space screens
resolve a slug through `spaceForSlug` and follow the rename, rather than
treating the space as gone.

## Space screen

The header switches between Talk, Notes, and Agent. A space dock gives access
to other spaces and makes a new one.

The right rail has Phrases and Voice tabs, and all three modes carry it. It expands to a 320px panel on large screens.

The `panel-open` setting stores the active tab and open state. The desktop and web apps use the same panel rules.
