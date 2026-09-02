---
title: Desktop providers
description: The desktop app asks by job, not by brand — one service gives writing help, one speaks — and every API key stays in the macOS Keychain.
package: desktop
---

# Desktop providers

September borrows four services to do two jobs. The user chooses a job, not a
brand. This keeps the question answerable by a person who has never heard of
OpenRouter.

| Job          | Service            | Setup cost                           | Where it runs |
| ------------ | ------------------ | ------------------------------------ | ------------- |
| Writing help | Apple Intelligence | none                                 | On the Mac    |
| Writing help | OpenRouter         | an API key, and a model or Automatic | Cloud         |
| Voice        | macOS system voice | none                                 | On the Mac    |
| Voice        | ElevenLabs         | an API key and a model, then a voice | Cloud         |

Each job has a default that already works, so the Connect step needs no action
on a supported Mac. Voice always has a working answer, because the system voice
needs no account and no network. A broken key can never stop speech.

## Where a value lives

| Value                                   | Home                                                  |
| --------------------------------------- | ----------------------------------------------------- |
| An API key                              | The macOS Keychain, then process memory after startup |
| The chosen services and the voice id    | SQLite settings, key `services`                       |
| A key status, an account label, a quota | Memory, for the length of one screen                  |
| Apple Intelligence availability         | Memory, for the life of the process                   |

A key crosses the process boundary one time, from the key field to Rust. It
never comes back. `src-tauri/src/providers.rs` owns the Keychain and the
network. `src/services/os.ts` owns the only calls from React.

The WebView writes with a typed model client, and a typed model client wants
an address and a key. September gives it the address of a loopback proxy and a
token that lasts one run. `src-tauri/src/proxy.rs` binds `127.0.0.1` on a free
port, serves one path, and swaps the run token for the real key before it
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

The backend starts apfel when a screen first asks for its status or generation.
It reuses the process while its health request succeeds and replaces it when
the request fails.

## The model list shows the free models, and the search finds the others

`GET /api/v1/models` gives every model of the service, with a price for a
prompt token and a completion token. Rust marks a model `free` when both
prices read zero. A model with no price is not known to be free, so it is
paid. Every model crosses to the screen, with the free ones first.

The list shows the free rows until the user types. September promises that the
user needs no card, and a paid row in the resting list would break that
promise: the user picks a name, and the next suggestion fails with a bill they
cannot pay.

The **Search models** field reaches every model. A user with credit can find
the model they pay for, and a user without credit never meets one by accident.
Each word of the query must be in the name or in the id. A paid row reads
**Paid**. The row in use stays in the list while the words are there, so the
user always sees what speaks for them now.

The model lists and the voice list are the same control, `PickList`. It is a
list of 44px rows in two columns, not a dropdown, because a dropdown closes
when a dwell moves away from it. The 320px card of the space rail asks for one
column, with `columns={1}`.

The ElevenLabs model list appears twice. The key screen keeps the model beside
the key that lists it, and the Voice tab of the space rail asks again, where a
user hears the answer without leaving the conversation. Both write the one
`speech` setting. The voice list appears once, on `/voice`, beside the service:
a hundred rows, each with a sample to hear, do not fit a 320px card.

**Automatic** is the first row of the picker, and the default. It names no
model. The request then carries the free list of the app, and OpenRouter uses
the first model that answers. One busy model is therefore not one lost
sentence. A named model replaces that list, and the request asks for it alone.

The first picker writes the default model settings. Every text-generation job
uses these settings. A second picker can write separate Suggestions settings.
If the separate value is not null, Suggestions use it.

## The voice list holds the voices of the account

`GET /v2/voices?page_size=100&voice_type=non-default` gives the list. The web
app asks the same way, so the two apps show one list.

| Part         | Value         | Why                                               |
| ------------ | ------------- | ------------------------------------------------- |
| Version      | `v2`          | The v1 list has no `voice_type` filter.           |
| `voice_type` | `non-default` | The stock voices are not the voices of this user. |
| `page_size`  | `100`         | A page gives 10 without it.                       |

Rust sorts the list by category, in the order of the web app: `cloned`,
`professional`, `premade`, `similar`. The category does not reach the screen.

The web app also searches the public voice library, through
`/v1/shared-voices`. The desktop app does not port that search. Voice cloning
is separate: it creates a voice in the account, then the normal account list
can return it.

## A clone crosses as raw multipart audio

React owns the uploaded files and microphone recordings while `/voice/clone`
is open. It makes the ElevenLabs multipart form once, then sends the bytes and
the generated `content-type` boundary through raw Tauri IPC. The native
command adds the cached key and forwards the same body to the fixed
`/v1/voices/add` endpoint.

The UI rejects an encoded request over 100 MB before it crosses IPC. Rust
enforces the same limit at the native boundary.

This boundary avoids a base64 copy and keeps both the key and an arbitrary
provider URL out of the WebView. The samples stay in memory. Leaving the
cloning page or quitting the app removes them.

After a successful clone, the screen selects ElevenLabs and the new voice. It
does not replace the current model. It then returns to `/voice`. The voice list
there keeps the new row visible while ElevenLabs catches up. A failed request
keeps the user on the cloning page with the draft intact.

## The names cross the boundary

ElevenLabs names a voice `voice_id` and a model `model_id`. The screens read
`id`. Rust therefore renames each field on the way in only, with
`#[serde(rename(deserialize = "..."))]`.

A two-way rename sends `voice_id` to the WebView. `voice.id` is then
`undefined` for every row, and `undefined === undefined` makes every row look
selected. The `SpeechSettings` type has the opposite direction: the WebView
sends it, so it uses `#[serde(rename_all = "camelCase")]`.

## The voice preview needs no key

The ElevenLabs voice list carries a public `preview_url` for each voice. The
preview button plays that URL. This needs no key, no speech call, and no audio
code in Rust.
