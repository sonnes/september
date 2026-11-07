---
title: Writing model settings
description: One provider serves all AI text. Suggestions have one model, and the agent and phrases share another.
package: core, app-ui, desktop, web
---

# Writing model settings

The saved setup contains `defaultModel` and `suggestionsModel`. Each model
setting contains a writing service and a model ID. An empty model ID asks the
selected service to choose a model automatically.

For an Automatic OpenRouter selection, suggestions and phrases send
`FREE_MODELS` as the `models` list, with no `model`. OpenRouter uses the first
model in the list that answers. This rule applies to the default model and the
Suggestions override. An Automatic Agent sends `AUTOMATIC_MODEL`,
`openrouter/free`, because OpenRouter then picks a free model that supports
the tools. `packages/core/rules/model-config.ts` holds both values, and the
shared writing service in `packages/app-ui/services/ai.ts` sends them.

Every text-generation job reads `defaultModel`. This rule includes
saved-phrase generation and Agent turns. The provider of
`defaultModel` is the provider of every feature.

Suggestions read `suggestionsModel` first. If this value is null, Suggestions
read `defaultModel`. `modelConfigFor` in core takes a `GenerationFeature`, the
job that asks for text, and owns this selection.

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

Automatic suggestions require a text edit that ends in whitespace,
`. , ! ? ; :`, or the `]` that ends an audio tag, followed by a 200 ms pause. Empty input and restored drafts do
not trigger requests. Local word completion remains available after each letter.
A change of the Talk mood also counts as an edit, so the suggestions follow the
new mood at once. See [audio tags and moods](audio-tags.md).

Turning automatic suggestions off clears generated rows and cancels pending
requests. Turning automatic phrase generation off stops automatic creation and
refresh of phrases and starters. Existing phrases remain available. Explicit
Agent requests can still create or edit phrases.

Turning the agent off hides Agent in the space mode control. A new space and a
space saved in Agent mode open in Talk.

Setup writes run in order and notify mounted generation hooks after persistence.
A failed write reports an error without a change to the saved switch value.
