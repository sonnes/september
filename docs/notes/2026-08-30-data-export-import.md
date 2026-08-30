---
title: Data export and import implementation notes
description: Decisions and deviations that arise during the portable backup implementation.
date: 2026-08-30
plan: ../plans/2026-08-30-data-export-import.md
---

# Data export and import implementation notes

- Desktop export uses the WebView download path already used by note and usage
  exports. It needs no native save-dialog permission or new dependency.
- Desktop export normalizes the retired boolean `panel-open` value to the
  current panel object. This lets an older profile create a valid version 1
  backup before the user opens the panel again.
- Some desktop profiles name the retired `camera` panel tab. Export changes it
  to `phrases`. Core applies the same repair when it reads an existing file.
- Some desktop profiles saved setup before it included an owner ID. Export
  fills that field from the current Mac login name without changing SQLite.
- Tauri rejects commands with string values. The Data screen now shows those
  values instead of replacing them with a generic error.
