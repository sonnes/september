---
title: Help page implementation notes
plan: ../plans/2026-09-05-help-pages.md
---

# Help page implementation notes

- Navigation state stays in memory for the current app window. It does not
  add a database, storage key, or URL parameter. Reload clears this state.
- Overview images use a disclosure after the instructions. This keeps the
  first instruction visible without removing screen context.
- Screenshot widths record CSS capture sizes. QA found that the narrow
  Continue image became blurry when stretched across the guide.
- Browser screenshots ship in both apps and identify their platform in
  captions. No screenshot claims to demonstrate a native Mac feature.
- Export guidance now distinguishes browser video support from desktop audio
  and text downloads. It does not promise a native save dialog.
- The compact rail keeps its existing width. Reduced horizontal padding fits
  the larger targets without changing the design system.
- Screenshot agents used isolated sample profiles without provider keys.
  Portrait and 200% reflow checks used Chromium, not physical iPad Safari.

Validation passed: 126 web tests, 193 core tests, and 52 desktop tests.
Web and desktop builds passed. Core and UI type checks passed. Web lint passed.
Shared-file lint reported two existing unused-import warnings in `blocks/screen.tsx`.
All 15 screenshot files exist and match between the two apps.

Final screenshots: [Help home](../research/2026-09-05-help-pages/after-home.png)
and [first-message guide](../research/2026-09-05-help-pages/after-guide.png).
