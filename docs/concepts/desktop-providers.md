---
title: Desktop providers
description: The desktop app asks by job, not by brand — one service gives writing help, one speaks — and every API key stays in the macOS Keychain.
package: desktop
---

# Desktop providers

September borrows four services to do two jobs. The user chooses a job, not a
brand. This keeps the question answerable by a person who has never heard of
OpenRouter.

| Job | Service | Setup cost | Where it runs |
| --- | --- | --- | --- |
| Writing help | Apple Intelligence | none | On the Mac |
| Writing help | OpenRouter | an API key | Cloud |
| Voice | macOS system voice | none | On the Mac |
| Voice | ElevenLabs | an API key, then a voice and a model | Cloud |

Each job has a default that already works, so the Connect step needs no action
on a supported Mac. Voice always has a working answer, because the system voice
needs no account and no network. A broken key can never stop speech.

## Where a value lives

| Value | Home |
| --- | --- |
| An API key | The macOS Keychain, service `com.september.desktop` |
| The chosen services and the voice id | SQLite settings, key `services` |
| A key status, an account label, a quota | Memory, for the length of one screen |

A key crosses the process boundary one time, from the key field to Rust. It
never comes back. `src-tauri/src/providers.rs` owns the Keychain and the
network. `src/os.ts` owns the only calls from React.

The Usage screen can also read the current ElevenLabs allowance. Rust returns
the tier, used characters, character limit, and reset time through
`provider_quota`. It returns no key, and no quota value is stored in SQLite.

## What a status says

`provider_status` tests each stored key again on every read. A key that worked
in June can fail in August, and a status that trusts the Keychain alone would
lie. A key that now fails reports `connected: false`, with the reason in
`detail`.

`provider_connect` tests a key before it writes to the Keychain. A key that
fails is never stored, so the Keychain holds only keys that worked at least
one time.

## Apple Intelligence has no key and can still fail

The apfel sidecar reports three states, and the step shows a different control
for each one. See [on-device AI](on-device-ai.md).

| `supported` | `available` | The step shows |
| --- | --- | --- |
| `false` | `false` | Nothing. The choice disappears. |
| `true` | `false` | "Turn it on in System Settings", with the reason |
| `true` | `true` | "Ready", and the choice is selected |

An unsupported Mac gets no disabled control. A control the user can never use
is noise.

## The voice list holds the voices of the account

`GET /v2/voices?page_size=100&voice_type=non-default` gives the list. The web
app asks the same way, so the two apps show one list.

| Part | Value | Why |
| --- | --- | --- |
| Version | `v2` | The v1 list has no `voice_type` filter. |
| `voice_type` | `non-default` | The stock voices are not the voices of this user. |
| `page_size` | `100` | A page gives 10 without it. |

Rust sorts the list by category, in the order of the web app: `cloned`,
`professional`, `premade`, `similar`. The category does not reach the screen.

The web app also searches the public voice library, through
`/v1/shared-voices`. The desktop app does not. That is a different job: it adds
a voice to an account, and the desktop app only chooses between the voices that
an account holds.

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
