---
title: Writing model settings
description: One default selects the service and model for all AI text, while Suggestions can supply one optional override.
package: core, app-ui, desktop, web
---

# Writing model settings

The saved setup contains `defaultModel` and `suggestionsModel`. Each model
setting contains a writing service and a model ID. An empty model ID asks the
selected service to choose a model automatically.

Every text-generation job reads `defaultModel`. This rule includes space
descriptions, saved-phrase generation, and Agent turns.

Suggestions read `suggestionsModel` first. If this value is null, Suggestions
read `defaultModel`. The shared `modelConfigFor` rule owns this selection.

Writing settings can select a separate Suggestions service. The OpenRouter
connection screen can select a separate Suggestions model. The user can select
**Use default** to remove the override.

The browser stores the setup in IndexedDB. The desktop app stores the setup in
SQLite. Portable backups include both model settings but do not include
provider keys.
