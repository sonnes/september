---
title: Desktop speech providers — implementation notes
plan: ../plans/2026-08-21-desktop-speech-providers.md
---

# Desktop speech providers — implementation notes

What the plan does not say.

## Two names did not cross the boundary

The plan gives Rust the ElevenLabs calls and gives the screens the choices. It
does not say which names cross between the two. Two of them did not match, and
each one broke a feature without an error message.

**Every voice looked selected.** `providers::Voice` had
`#[serde(rename = "voice_id")]` on its `id` field. A `rename` works in both
directions, so Tauri also sent `voice_id` to the WebView. `voice.id` was then
`undefined` for every row. After the first press, `settings.voiceId` was
`undefined` too, and `undefined === undefined` is true. Every row therefore
drew the selected border. The fix is `rename(deserialize = "voice_id")`, which
works on the way in only.

**No cloud sentence ever reached ElevenLabs.** `speech::SpeechSettings` used
snake case. The Voice screen sends the TypeScript field names, which are camel
case. `speech_synthesize` answered `missing field 'model_id'` for every
sentence. The cloud voice then fell back to the system voice, exactly as the
plan says it must, so the app stayed usable and the error stayed quiet. The fix
is `#[serde(rename_all = "camelCase")]` on the struct.

A test now holds each direction: one in `providers.rs` for the two `id` fields,
one in `speech.rs` for the settings that the screen sends.

## The model is a choice, not a constant

`SpeechSettings.modelId` was written one time, as `eleven_turbo_v2_5`, and no
screen could change it. The model decides the quality, the speed, and the
languages, so a user with a key must be able to choose it.

`provider_models` reads `GET /v1/models` and keeps the models with
`can_do_text_to_speech`. A model that only listens is not a choice the Voice
screen can offer. The list comes from the service, so a new model needs no
change here.

The screen shows the description that the service gives. A model name alone
says little about what the choice costs.

## The voice list matches the web app

The plan says "the ElevenLabs voice" and does not say which list. Rust asked
`GET /v1/voices`, which gives every voice of the account **and** the stock
voices. The screen therefore mixed the cloned voices of the user with Brian,
Lily, and Adam.

The web app asks `GET /v2/voices` with `voice_type=non-default`, and sorts the
answer by category. Rust now does the same, so the two apps show one list.

Two details of the web call did not port:

- The web app sends `limit=100`. The v2 list counts a page with `page_size`,
  so `limit` does nothing and the answer holds 10 voices. Rust sends
  `page_size=100`.
- The web app sends a search term to `/v1/shared-voices`, the public voice
  library. That is a different job — it adds a voice to an account. The
  desktop app chooses between the voices that an account holds already.

The model list stays an API call. The web app holds a written list of models in
the code, which goes out of date and cannot know what one account can use.

## The file name already held the model

`file_name()` puts `model_id` in the hash, so a model change gives a new file
and the old files stay correct. This needed no change.
