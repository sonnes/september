---
plan: ../plans/2026-09-25-settings-simplification.md
---

# Settings Simplification Implementation Notes

- The saved setup keeps its shape. `defaultModel` now means the provider and
  the agent and phrases model. This avoids a change to the backup format and
  the Rust backup type. Only `agentEnabled` is new.
- A null `suggestionsModel` still uses `defaultModel`. The Suggestions list then
  shows the agent model as "Current: <id>" if that model is not on the
  suggestions list.
- A saved model outside a curated list adds a ninth row. `PickList` then shows
  its search field. This happens only until the user picks a curated row.
- `describeSpace` has no callers. The `context` feature reads `defaultModel`
  through `modelConfigFor`, so it follows the agent model without a change.
- Rust has no default voice model. `eleven_turbo_v2_5` appears only in Rust
  test fixtures, so `speech.rs` did not change.
- The Talk rail no longer asks ElevenLabs for its model list. It shows the
  three models in `VOICE_MODELS`. The key pages no longer call `listModels` or
  `listWritingModels`. Both functions stay in the platform services.
- The plan put the voice model under Custom, and each preset set Flash v2.5.
  After review, the model list always shows for an ElevenLabs voice. A preset
  now keeps the model and sets only the stability and the similarity. On Eleven
  v3, Steady, Natural, and Expressive take Robust, Natural, and Creative.
- The ElevenLabs docs give no numbers for the Eleven v3 stability modes. The
  values 1.0, 0.5, and 0.0 are an assumption. Make sure of them with a real
  Eleven v3 request.
- The Voice screen groups the voices into Yours, Heard lately, From the
  library, and ElevenLabs voices. A real account list showed that
  `professional` voices are library copies with `is_owner: false`, so Yours
  reads `is_owner` and falls back to the `cloned` and `generated` categories. A voice played now joins Heard lately on the next visit. A
  row that moved under the pointer or the scan would break the aim of a user
  who dwells or uses a switch.
- `heard-voices` is a device setting. It is not in `PORTABLE_SETTING_KEYS`, so a
  backup leaves it out.
- The Rust `Voice` type now sends `category` and `is_owner` to the screen. The
  category was read only for the sort before.
- `PickList` has a `list` layout for the voice list: cards with the play
  button inside, two columns under each group heading. The model lists keep
  the grid. The grid rows now truncate a long name instead of spilling into the
  next column.
- The Talk rail does not show the chosen voice name. The mock showed it, but
  the name needs the voice list request that the rail avoids.
- Speaking style has no "Start from Plain" button. A press on Plain gives the
  same result.
- The Open models group assumes open weights for DeepSeek V4 Flash, Qwen3.8
  27B, Kimi K3, and GLM 5.3. Make sure of each one before release.

## Validation

Core, web, and desktop tests passed. Web lint and the web and desktop builds
passed. Rust tests passed except the virtual microphone test, which fails with
Core Audio error `-10875`, as in earlier runs. Clippy passed. The format check
reports only `tests/tmp_file_play.rs`, which belongs to other work.
