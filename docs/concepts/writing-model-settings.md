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

## Automatic Generation

Writing settings also store `autoSuggestions` and `autoPhrases`. These switches
control automatic requests independently of the selected models. Both default
to `true`, including older saved setups and backups with missing fields.

Automatic suggestions require a text edit that ends in whitespace or
`. , ! ? ; :`, followed by a 200 ms pause. Empty input and restored drafts do
not trigger requests. Local word completion remains available after each letter.

Turning automatic suggestions off clears generated rows and cancels pending
requests. Turning automatic phrase generation off stops automatic creation and
refresh of phrases and starters. Existing phrases remain available. Explicit
Agent requests can still create or edit phrases.

Setup writes run in order and notify mounted generation hooks after persistence.
A failed write reports an error without a change to the saved switch value.
