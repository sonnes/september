---
title: Desktop saved phrases and suggestion stripes — implementation notes
plan: ../plans/2026-08-21-desktop-phrases-suggestions.md
---

# Desktop saved phrases and suggestion stripes — implementation notes

What the plan does not say.

## The panel now wears the layout of the web app

The first build of `src/phrase-panel.tsx` gave each phrase a card, with a code
field always open below the text. The web app gives each phrase one line. The
panel is a port again, and these parts came across:

- A form above the rows adds a phrase and its code. The card layout had no way
  to add a phrase at all. A user could only keep one from the composer.
- The rows are in two groups: the kept rows first, under a pin, then the
  written rows under a star.
- A press on the text of a row puts the phrase in the composer. The card
  layout showed the text and did nothing with a press.
- A code is a badge. The badge opens a small field that Enter keeps, Escape
  leaves, and a press somewhere else keeps. A muted badge means that a model
  wrote the code and can write over it.

## The targets are 44px, not 36px

The web app gives each control of a row `size-9`, which is 36px. `DESIGN.md`
asks for a 44px target and says not to pack small icon-only controls tightly.
September is for people who point with less accuracy than a browser user, so
the desktop rows use `size-11`.

This is the only difference from the web layout. `RowButton` holds the size in
one place, so a new control cannot lose it.

## The insert rule stays in the screen

`insertPhrase` is not a new export of `src/phrases.ts`. The web app keeps the
same three lines inside its panel component, and `src/phrases.ts` must stay a
copy of the web module. A helper on one side only would break that.

Both screens that hold the rail pass `onInsert`, because a phrase with no place
to go is a row that does nothing when pressed.

## Two words for one thing

The group label is **Kept**, not **Pinned**. The desktop app already says
"Keep this" on the control, and one thing must have one name.
