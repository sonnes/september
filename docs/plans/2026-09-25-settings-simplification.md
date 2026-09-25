# Settings Simplification

Status: Approved. In progress.

Mock: `docs/mocks/2026-09-24-settings-simplification-options.html`, revision 3 with the agent on by default.

## Scope

This plan makes the AI Assistance screen, the key pages, and the voice card in the Talk rail simpler.
The tab names and the provider names do not change.

This plan does not change the Services tab, Usage, Data, or the Voice screen.

## AI Assistance

The screen has four sections, in this order:

| Section | Controls |
| --- | --- |
| Provider | Apple Intelligence, OpenRouter, No AI Assistance. Each row shows its status. OpenRouter shows Manage or Connect. |
| Suggestions | A switch for `autoSuggestions`. A model list. |
| Agent and phrases | A switch for `autoPhrases`. A switch for `agentEnabled`. One model list. |
| Speaking style | Plain, Warm, Detailed, Custom. The text field shows only for Custom. |

If the provider is Apple Intelligence, the model lists do not show. Apple Intelligence has one model.
If the provider is No AI Assistance, the feature sections and Speaking style do not show.

## Model Lists

Each list is a `PickList` with a fixed height. The first row is Automatic. Then a Frontier group and an Open models group follow.
Each list has eight rows or fewer, so `PickList` shows no search field.
The lists are constants in `packages/core/rules/model-config.ts`.

A saved model that is not in the list shows as a first row, "Current: <id>". The user keeps it until they pick another row.

## Settings Data

The saved shape does not change.

| Field | Meaning after this plan |
| --- | --- |
| `defaultModel` | The provider, and the model for the agent and phrases |
| `suggestionsModel` | The model for suggestions. Null uses `defaultModel`, as before. |
| `agentEnabled` | New. Default `true`. |

A provider change writes the service into `defaultModel` and into `suggestionsModel` when it is not null.

## Agent Switch

If `agentEnabled` is `false`:

1. The space mode control does not show Agent.
2. A new space opens in Talk.
3. A saved Agent mode opens in Talk.

## Key Pages

The key pages keep the guide, the key, and the link to the provider.
The OpenRouter model lists and the ElevenLabs model list move off the key pages.
The OpenRouter key page gets a link to AI Assistance.

## Voice

The ElevenLabs documentation marks `eleven_turbo_v2_5` as deprecated. The replacement is `eleven_flash_v2_5`.

1. The default model changes to `eleven_flash_v2_5` in web, desktop, and Rust.
2. A saved `eleven_turbo_v2_5` reads as `eleven_flash_v2_5`.
3. The Talk rail shows Speed, then Expression: Steady, Natural, Expressive, Custom.

| Expression | Model | Stability | Similarity |
| --- | --- | --- | --- |
| Steady | `eleven_flash_v2_5` | 0.75 | 0.75 |
| Natural | `eleven_flash_v2_5` | 0.5 | 0.75 |
| Expressive | `eleven_flash_v2_5` | 0.35 | 0.75 |

Custom shows Steadiness, Likeness, and a list of three models: Flash v2.5, Multilingual v2, and Eleven v3.
Eleven v3 has no similarity setting, so Likeness does not show for it.
Eleven v3 has three stability modes, so Steadiness shows Robust (1.0), Natural (0.5), and Creative (0.0).

## Tests

- Core: voice expression rules, the model migration, the agent mode rules, and the backup field.
- Web: the AI Assistance screen, the voice card, and the saved setup default.
- Rust: the backup field and the default voice model.
