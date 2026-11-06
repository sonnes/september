---
title: Desktop providers
description: The desktop app asks by job, not by brand — one service gives AI Assistance, one speaks — and every API key stays in the macOS Keychain.
package: desktop
---

# Desktop providers

September borrows four services to do two jobs. The user chooses a job, not a
brand. This keeps the question answerable by a person who has never heard of
OpenRouter.

| Job           | Service            | Setup cost                           | Where it runs |
| ------------- | ------------------ | ------------------------------------ | ------------- |
| AI Assistance | Apple Intelligence | none                                 | On the Mac    |
| AI Assistance | OpenRouter         | browser authorization, then a model  | Cloud         |
| Voice         | macOS system voice | none                                 | On the Mac    |
| Voice         | ElevenLabs         | an API key and a model, then a voice | Cloud         |

Each job has a default that already works, so the Connect step needs no action
on a supported Mac. Voice always has a working answer, because the system voice
needs no account and no network. A broken key can never stop speech.

## Where a value lives

| Value                                   | Home                                                  |
| --------------------------------------- | ----------------------------------------------------- |
| An API key                              | The macOS Keychain, then process memory after startup |
| The chosen services and the voice id    | SQLite settings, keys `setup` and `speech`            |
| A key status, an account label, a quota | Memory, for the length of one screen                  |
| Apple Intelligence availability         | Asked of the sidecar on each status read              |

OpenRouter authorization and key exchange happen in Rust through PKCE and a
temporary loopback callback. Its key never enters the WebView. An ElevenLabs
key crosses from its input field to Rust once and never comes back. Rust also sends the ElevenLabs request of Speak, and the Text to Dialogue stream of the Dialogue voice, with this key. See [streaming voice](streaming-voice.md). `src-tauri/src/providers.rs` owns the Keychain and the
network. `apps/desktop/src/platform.ts` owns the only provider calls from React, through
`call` and `callRaw` in `src/commands.ts`.

The WebView writes with a typed model client, and a typed model client wants
an address and a key. September gives it the address of a loopback proxy and a
token that lasts one run. `src-tauri/src/proxy.rs` binds `127.0.0.1` on a free
port, serves the OpenRouter path and the Apple path, and swaps the run token for the real key before it
forwards. A page that guesses the port still needs a token it was never given,
and a key still never reaches the WebView.

Rust reads the OpenRouter and ElevenLabs entries once during startup. Later
commands use the cached keys. Connecting or forgetting a service updates the
Keychain and memory together, so a settings change does not need a restart.

The Usage screen can also read the current ElevenLabs credits. Rust returns
the tier, used characters, character limit, and reset time through
`provider_quota`. It returns no key, and no quota value is stored in SQLite.

## What a status says

`provider_status` tests each cached key again on every read. A key that worked
in June can fail in August, and a status that trusts storage alone would lie.
A key that now fails reports `connected: false`, with the reason in `detail`.

`provider_connect` tests a key before it writes to the Keychain. A key that
fails is never stored, so the Keychain holds only keys that worked at least
one time.

## Apple Intelligence has no key and can still fail

The apfel sidecar reports three states, and the step shows a different control
for each one. See [on-device AI](on-device-ai.md).

| `supported` | `available` | The step shows                                   |
| ----------- | ----------- | ------------------------------------------------ |
| `false`     | `false`     | Nothing. The choice disappears.                  |
| `true`      | `false`     | "Turn it on in System Settings", with the reason |
| `true`      | `true`      | "Ready", and the choice is selected              |

An unsupported Mac gets no disabled control. A control the user can never use
is noise.

The backend starts apfel when a screen first asks for its status, or when the
proxy first sends a request to it.
It reuses the process while its health request succeeds and replaces it when
the request fails.

## The model lists are curated

Rust gives no model list. The OpenRouter and ElevenLabs models that the
screens offer are fixed lists in `packages/core`. The two apps show the same
lists.

`SUGGESTIONS_MODELS` and `AGENT_MODELS` in `rules/model-config.ts` hold the
OpenRouter models. Each list starts with **Automatic**, and each row reads
**Free** or **Paid**. Automatic is the default. The request names
`openrouter/free`, and OpenRouter picks a free model that answers. See
[writing model settings](writing-model-settings.md).

`VOICE_MODELS` and `DIALOGUE_MODELS` in `rules/voice.ts` hold the ElevenLabs
models. The list appears once, under Custom in the Voice tab of the space
rail. A user hears the result there without leaving the conversation. The
choice goes into the `speech` setting.

The model lists and the voice list use the same control, `PickList`. It is a
radio group of 48px rows in two columns, not a dropdown. A dropdown closes
when a dwell moves away from it. The arrow keys move the choice. The 320px
card of the space rail asks for one column, with `columns={1}`.

The voice list appears once, on `/voice`, beside the service. A hundred rows,
each with a sample to hear, do not fit a 320px card.

## The voice list holds the voices of the account

The desktop app gets the list from `GET /v2/voices?page_size=100`, in Rust.
A page gives 10 voices without `page_size`. The web app gets the list from
`GET /v1/voices`, in the browser. Both lists hold the voices of the account
and the stock voices of ElevenLabs, each with its category.

`voiceList` in `@september/core/rules/voice` decides the rows. The Voice
screen and the Connect step of setup both use it:

- The list shows the voices of the account. These are the voices of every
  category except `premade`, the ElevenLabs stock voices.
- A search also shows the stock voices that match it.
- If the account has no voices of its own, the list shows the stock voices.
- The chosen voice shows when there is no search.

Rust gives the list in the order of ElevenLabs. The category and `is_owner`
reach the screen, and `voiceRows` in core sorts the rows. `voiceRows` puts a voice
with `is_owner: true` in **Yours**, a `premade` voice in **ElevenLabs voices**,
and every other voice in **From the library**. A professional voice from the
library has `is_owner: false`, so the category alone cannot say whose it is.

Neither app searches the public voice library. A cloned voice goes into the
account, so the account list returns it.

## A clone crosses as raw multipart audio

React owns the uploaded files and microphone recordings while `/voice/clone`
is open. It makes the ElevenLabs multipart form once, then sends the bytes and
the generated `content-type` boundary through raw Tauri IPC. The native
command adds the cached key and forwards the same body to the fixed
`/v1/voices/add` endpoint.

The UI rejects samples over 100 MB in total before they cross IPC. Rust
rejects a body over 101 MiB, which leaves room for the multipart headers.

This boundary avoids a base64 copy and keeps both the key and an arbitrary
provider URL out of the WebView. The samples stay in memory. Leaving the
cloning page or quitting the app removes them.

After a successful clone, the screen selects the new voice. It selects
ElevenLabs, or keeps Dialogue when Dialogue is in use. It
does not replace the current model. It then returns to `/voice`. The voice list
there keeps the new row visible while ElevenLabs catches up. A failed request
keeps the user on the cloning page with the draft intact.

## The names cross the boundary

ElevenLabs names a voice `voice_id`. The screens read `id`. Rust therefore
renames the field on the way in only, with
`#[serde(rename(deserialize = "..."))]`.

A two-way rename sends `voice_id` to the WebView. `voice.id` is then
`undefined` for every row, and `undefined === undefined` makes every row look
selected. The `VoiceSettings` type has the opposite direction: the WebView
sends it, so it uses `#[serde(rename_all = "camelCase")]`.

## The voice preview needs no key

The ElevenLabs voice list carries a public `preview_url` for each voice. The
preview button plays that URL. This needs no key, no speech call, and no audio
code in Rust.
