---
plan: docs/plans/2026-08-18-brand-identity.md
---

# Brand identity implementation notes

- The wordmark remains live text so it can switch to an inverse treatment on indigo surfaces without duplicating assets.
- A generator owns the raster favicon and install-icon variants; `public/logo.svg` remains the scalable browser source.
- The app loads only Lexend's Latin 700 subset because the brand strings are fixed to `Sep` and `September`; multilingual interface text remains in Noto Sans.
