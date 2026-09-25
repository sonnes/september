---
title: Voice expression
description: The Voice tab of the space rail sets the ElevenLabs model, and three presets and Custom set the stability and similarity.
package: core, app-ui, desktop, web
---

# Voice expression

The Voice tab of the space rail shows Speed for every voice. An ElevenLabs
voice also shows Voice model and Expression. Voice model always shows. Its list
holds Flash v2.5, Multilingual v2, and Eleven v3. Expression holds Steady,
Natural, Expressive, and Custom.

A preset writes the stability and the similarity into the `speech` setting. It
keeps the model. On Eleven v3, each preset takes one of the three stability
modes of Eleven v3:

| Preset | Stability | Stability on Eleven v3 | Similarity |
| --- | --- | --- | --- |
| Steady | 0.75 | 1.0 (Robust) | 0.75 |
| Natural | 0.5 | 0.5 (Natural) | 0.75 |
| Expressive | 0.35 | 0.0 (Creative) | 0.75 |

The values follow the ElevenLabs guide. Stability from 0.30 to 0.50 gives
dynamic speech. Stability from 0.60 to 0.85 gives consistent speech. The
default similarity is 0.75.

If a preset is on and the user picks a new model, the tab writes the values of
that preset for the new model. Thus the preset stays on.

Custom shows Steadiness and Likeness. Eleven v3 has no similarity setting, so
Likeness does not show for it. Eleven v3 takes three stability modes: Robust
(1.0), Natural (0.5), and Creative (0.0). If Custom is on and the user picks
Eleven v3, the tab snaps the stability to the nearest mode.

`expressionOf` in `packages/core/rules/voice.ts` reads a saved sound for its
model. If the sound matches no preset, the tab opens in Custom.

The Dialogue voice has two models: Eleven v3 and Eleven v3 Conversational. Its
tab shows Voice model with these two models, and Steady, Natural, and
Expressive, which are the three stability modes of Eleven v3. Speed and Custom
do not show. The model goes in `dialogueModelId`. The Dialogue endpoint has no speed field. The
saved `modelId` stays, so a return to the ElevenLabs service finds the model
that the user chose.

## Deprecated Models

ElevenLabs replaced `eleven_turbo_v2_5` with `eleven_flash_v2_5`. The default
model is `eleven_flash_v2_5`. `voiceModelFrom` reads a saved Turbo model as its
Flash replacement, so an older `speech` setting needs no migration step.
