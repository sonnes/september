---
title: Writing model settings
description: One provider serves all AI text. Suggestions have one model, and the agent and phrases share another.
package: core, app-ui, desktop, web
---

# Writing model settings

The saved setup contains `defaultModel` and `suggestionsModel`. Each model
setting contains a writing service and a model ID. An empty model ID asks the
selected service to choose a model automatically.

The browser sends `openrouter/free` for an Automatic OpenRouter selection.
This rule applies to the default model and the Suggestions override.

Every text-generation job reads `defaultModel`. This rule includes space
descriptions, saved-phrase generation, and Agent turns. The provider of
`defaultModel` is the provider of every feature.

Suggestions read `suggestionsModel` first. If this value is null, Suggestions
read `defaultModel`. The shared `modelConfigFor` rule owns this selection.

AI Assistance shows the provider first. A provider change writes the new
service into `defaultModel`, and into `suggestionsModel` when it is not null.

The Suggestions section writes `suggestionsModel`. The Agent and phrases section
writes `defaultModel`. Each section offers a curated list from
`rules/model-config.ts`: Automatic, then a Frontier group and an Open models
group. A saved model that is not on the list shows as the first row, "Current:
<id>".

The browser stores the setup in IndexedDB. The desktop app stores the setup in
SQLite. Portable backups include both model settings but do not include
provider keys.

## Automatic Generation

Writing settings also store `autoSuggestions`, `autoPhrases`, and
`agentEnabled`. These switches work independently of the selected models. All
three default to `true`, including older saved setups and backups with missing
fields.

Automatic suggestions require a text edit that ends in whitespace or
`. , ! ? ; :`, followed by a 200 ms pause. Empty input and restored drafts do
not trigger requests. Local word completion remains available after each letter.

Turning automatic suggestions off clears generated rows and cancels pending
requests. Turning automatic phrase generation off stops automatic creation and
refresh of phrases and starters. Existing phrases remain available. Explicit
Agent requests can still create or edit phrases.

Turning the agent off hides Agent in the space mode control. A new space and a
space saved in Agent mode open in Talk.

Setup writes run in order and notify mounted generation hooks after persistence.
A failed write reports an error without a change to the saved switch value.
