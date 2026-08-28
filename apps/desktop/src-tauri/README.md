# September desktop backend

This Tauri v2 backend gives the independent desktop UI one SQLite database.
It stores settings, domain rows, and local usage events in separate tables.
The command surface also reads the operating-system user name, provides local
text generation through apfel, and holds cloud API keys in the macOS Keychain.

## Run backend checks

Run these commands from this directory:

```sh
cargo test
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
```

Use `pnpm tauri:dev` or `pnpm tauri:build` from `apps/desktop` to run or package
the complete application.

The Tauri product and initial window are named `September`. The default
capability lets the UI replace the native window title after navigation, so
each page adds its name to the app name.

The Tauri commands prepare apfel automatically on an Apple Silicon Mac.
Run `pnpm apfel:prepare` from `apps/desktop` to prepare only the sidecar.

## Understand storage

Rust opens `september.sqlite3` in Tauri's application-local-data directory.
The `settings` table stores a unique text key and a JSON value. Keys must
contain 1 to 256 bytes.

The `spaces`, `messages`, `notes`, and `saved_phrases` tables store domain
fields in typed columns. Messages and notes can belong to a space. Deleting a
space deletes its messages and scoped notes, while global messages and notes
remain. Timestamps are Unix milliseconds.

The `analytics_events` table stores one indexed event type and timestamp with
a JSON payload. It has no foreign key to a space, because a retained usage
total must survive when the user deletes a conversation.

Schema version 6 creates all six tables. Released builds before the domain
tables used versions 1 to 3 for a database that held only the settings, so the
version of the domain tables must be higher than those. The migration uses
`CREATE TABLE IF NOT EXISTS`, so an install from an earlier build gains the
domain tables and keeps its settings.

## Call the domain APIs

Each domain command accepts a `request` object. A `put` command inserts or
replaces one complete row and returns the stored object. A `get` command
returns `null` when its row does not exist. A `delete` command returns `false`
when its row does not exist.

| Command | Request | Response |
| --- | --- | --- |
| `space_list` | `{ user_id }` | `Space[]` |
| `space_get` | `{ id }` | `Space \| null` |
| `space_put` | `Space` | `Space` |
| `space_delete` | `{ id }` | `boolean` |
| `message_list` | `{ space_id? }` | `Message[]` |
| `message_get` | `{ id }` | `Message \| null` |
| `message_put` | `Message` | `Message` |
| `message_delete` | `{ id }` | `boolean` |
| `note_list` | `{ space_id? }` | `Note[]` |
| `note_get` | `{ id }` | `Note \| null` |
| `note_put` | `Note` | `Note` |
| `note_delete` | `{ id }` | `boolean` |
| `phrase_list` | `{ space_id? }` | `SavedPhrase[]` |
| `phrase_put` | `SavedPhrase` | `SavedPhrase` |
| `phrase_delete` | `{ id }` | `boolean` |
| `phrase_replace_ai` | `{ space_id, phrases }` | `SavedPhrase[]` |

The objects use the same snake-case fields as the SQLite columns:

```ts
type Space = {
  id: string;
  user_id: string;
  title?: string;
  context?: string;
  phrases_synced_count?: number;
  created_at: number;
  updated_at: number;
};

type Message = {
  id: string;
  space_id?: string;
  user_id: string;
  text: string;
  type: string;
  audio_path?: string;
  created_at: number;
};

type Note = {
  id: string;
  space_id?: string;
  name?: string;
  content: string;
  created_at: number;
  updated_at: number;
};
```

`space_list` returns one user's spaces from most recently updated to least
recently updated. Message lists use conversation order. Note lists use most
recently updated order. Pass `space_id` to filter messages or notes to one
space, or omit it to return every row.

IDs, user IDs, and message types must contain 1 to 256 bytes. Timestamps and
`phrases_synced_count` cannot be negative. An updated timestamp cannot precede
its created timestamp. A scoped message or note must reference an existing
space.

Deleting a space also deletes its scoped messages and notes. Global messages
and notes remain. For example, this call creates or replaces a space:

```ts
import { invoke } from "@tauri-apps/api/core";

const space = await invoke<Space>("space_put", {
  request: {
    id: crypto.randomUUID(),
    user_id: "local-user",
    title: "General",
    created_at: Date.now(),
    updated_at: Date.now(),
  },
});
```

## Call the usage API

`analytics_put` stores a local event. `analytics_list` returns one user's
events in an inclusive timestamp range, newest first.

| Command | Request | Response |
| --- | --- | --- |
| `analytics_put` | `AnalyticsEvent` | `AnalyticsEvent` |
| `analytics_list` | `{ user_id, start_at, end_at }` | `AnalyticsEvent[]` |

```ts
type AnalyticsEvent = {
  id: string;
  user_id: string;
  event_type: "message_sent" | "ai_generation" | "tts_generation";
  timestamp: number;
  data: Record<string, unknown>;
};
```

The app deletes events strictly older than 90 days during startup and before
or after each usage read or write. This also cleans a process that stays open
for more than 90 days. The timestamp index keeps cleanup and bounded reports
out of the event payload.

## Call the settings API

Each command accepts a `request` object.

| Command          | Request          | Response             |
| ---------------- | ---------------- | -------------------- |
| `setting_get`    | `{ key }`        | JSON value or `null` |
| `setting_put`    | `{ key, value }` | Stored JSON value    |
| `setting_delete` | `{ key }`        | `boolean`            |

Successful writes emit `september://settings-changed` with the changed keys.
Deleting a missing setting returns `false` and does not emit an event.

## Read the user name

The `user_name` command takes no request. It returns the name that the
operating system holds for the signed-in user. The result is empty when the
system has no usable name. The onboarding screen then starts with an empty
field. The command keeps the first GECOS field and rejects the `Unknown`
placeholder.

## Read the login name

The `user_id` command takes no request. It returns the login name of the
signed-in user, for example `ravi`. The command rejects its promise when the
system knows no login name.

A space and a message need an identifier for the owner. The display name from
`user_name` can be empty, and the user can change it, so it cannot be one.

## Connect a cloud service

September borrows two cloud services: OpenRouter for writing help, and
ElevenLabs for a voice. Each key lives in the macOS Keychain, under the service
name `com.september.desktop`. The account is `openrouter` or `elevenlabs`.

The backend reads both accounts once during startup and keeps their keys in
process memory. Provider commands read this cache, not the Keychain. A connect
or forget command updates the Keychain and the cache together.

A key never returns to the WebView. Every command answers with a status only.

| Command            | Request                | Response            |
| ------------------ | ---------------------- | ------------------- |
| `provider_status`  | none                   | One status for each service |
| `provider_connect` | `{ provider, key }`    | The status after the test |
| `provider_forget`  | `{ provider }`         | `boolean`           |
| `provider_voices`  | none                   | The ElevenLabs voices |
| `provider_clone_voice` | raw multipart audio | `{ id }`            |
| `provider_models`  | none                   | The ElevenLabs speech models |
| `provider_writing_models` | none            | Every OpenRouter model, free ones first |
| `provider_quota`   | none                   | The current ElevenLabs allowance or `null` |

```ts
type ProviderStatus = {
  provider: "openrouter" | "elevenlabs";
  connected: boolean;
  label: string | null;
  detail: string | null;
};
```

`provider_connect` tests the key before it writes to the Keychain. A key that
fails is not stored, and the command rejects its promise.

`provider_status` tests each cached key again. A key that worked in June can
fail in August, so a stored key that now fails reports `connected: false` with
the reason in `detail`.

`provider_voices` returns an empty list when no ElevenLabs key is stored. Each
voice carries `id`, `name`, and `preview_url`. The preview URL is public, so
the UI can play a sample without a key.

`provider_clone_voice` accepts only a raw `multipart/form-data` body with its
boundary in the `content-type` IPC header. The command rejects an empty body,
a JSON body, and a body over 100 MB. It adds the cached ElevenLabs key and
forwards the bytes to the fixed `/v1/voices/add` endpoint. Rust does not parse
or copy the audio into JSON.

`provider_quota` returns the account tier, used characters, character limit,
and reset time. It returns `null` when no ElevenLabs key is stored. The API key
never crosses the command boundary.

## Keep the phrases of a user

`phrase_replace_ai` takes `{ space_id, phrases }` and returns the phrases of
that space. It erases the rows with `pinned = 0` and writes the new rows, in
one transaction. A pinned row never changes, so a phrase that the user keeps
cannot be lost by a model. A replacement row that says it is pinned is
refused.

A phrase kind is `phrase` for a complete thought, or `starter` for an opening.
`phrase_list` without a space returns every row, because a code works in every
space.

## Generate text with a cloud model

The `openrouter_generate` command takes the request shape of `apfel_generate`
and answers in its response shape. The key stays in the Keychain. The response
includes the model OpenRouter used and its reported cost when the service
supplies one.

The request can name a `model`. Rust then asks for that model only. A request
with no model sends a small list of free models, and OpenRouter uses the first
one that answers. The Apple sidecar has one model on this Mac, so it ignores
the field.

`provider_writing_models` gives the models the user can choose. Each row has
`free`, which is true when a prompt token and a completion token both cost
zero. A model with no price is not known to be free, so `free` is false. Rust
sorts the free rows first, then by name. The screen shows the free rows and
its search reaches the others.

## Speak a sentence

The `speech_synthesize` command takes `{ text, settings }` and returns
`{ path, from_cache }`. The settings hold the provider, the voice, the model,
the stability, the similarity, and the speed.

Rust names the file from the SHA-256 of those settings and the normalized
words, then keeps it in `audio/` under the application-local-data directory.
The same request therefore reaches ElevenLabs one time. Rust writes to a
`.part` name first and renames, so a stopped application leaves no half-written
file.

Normalization removes the spaces at the ends of the text and makes each run of
spaces one space. It changes nothing else.

The command rejects when no ElevenLabs key is stored, and when the service
fails. The response carries a path, never a key. The WebView reads the file
through the asset protocol, whose scope is `$APPLOCALDATA/audio/*`.

Spoken messages use native playback so the Core Audio process tap can receive
their sound. Voice-list previews stay in the WebView and do not enter the tap.

| Command | Request | Response |
| --- | --- | --- |
| `speech_system` | `{ text, voice_id?, speed }` | none |
| `speech_file_play` | `{ path }` | none |
| `speech_native_stop` | none | none |

`speech_system` uses `AVSpeechSynthesizer`. `speech_file_play` accepts only a
cached file inside the application audio directory and uses `AVAudioPlayer`.

## Publish the virtual microphone

The native bridge publishes `September Microphone` as a public Core Audio
aggregate input. It contains one mono process tap for September audio.

| Command | Request | Response |
| --- | --- | --- |
| `virtual_microphone_status` | none | `{ active, name, uid, detail }` |
| `virtual_microphone_start` | none | `{ active, name, uid, detail }` |
| `virtual_microphone_stop` | none | `{ active, name, uid, detail }` |

The microphone starts only after the user enables it. The first start uses the
`NSAudioCaptureUsageDescription` message from `Info.plist`. The app destroys
the aggregate device and its process tap when the user stops it or quits.

The bridge also removes a stale aggregate device during application startup.
This cleanup handles an earlier process that ended before normal shutdown.
The feature requires macOS 26 or later and does not install a system driver.

`virtual_microphone_status` returns a `detail` while the microphone runs. macOS
publishes no way to read the answer to its audio-recording question, so a
refused tap is silent and reports nothing. The message names the one setting
that mends it.

Both native voices wait on a delegate callback, not on a clock. `speech_stop`
releases that wait, because `AVAudioPlayer` reports nothing when it is stopped.

## Stream the eye-tracker test bed

The optional `/eyetracker` test bed captures 1280×720 frames through
AVFoundation and asks Apple Vision for one face, both eye outlines, and both
pupils. Rust converts each pupil into its eye-relative position, rejects closed
or low-confidence eyes, and applies a small low-pass filter. Late frames are
discarded, and analysis is limited to about 15 frames per second. Rust pads the
detected face box into a 16:9 crop and smooths crop movement before it makes the
preview.

| Command | Request | Response |
| --- | --- | --- |
| `gaze_start` | `{ onEvent: Channel<GazeEvent> }` | none |
| `gaze_stop` | none | none |

The channel receives status events and a 320-pixel-wide RGBA face crop at no
more than five frames per second. Each frame includes the current smoothed
point when both eyes are valid. The WebView takes median samples at four box
corners and fits one linear mapping for each axis. It clips the mapped point to
the camera box. It does not convert it to a window or operating-system pointer.

Neither side saves the preview, point, or calibration. `gaze_stop` joins the
capture thread. Leaving the page and application exit use the same stop path.
The app requests camera access only after `gaze_start`; `Info.plist` explains
the use and the signed app has the camera entitlement.

## Use the apfel API

`apfel_status` and `apfel_generate` start the sidecar when the first command
needs it. Later calls reuse the healthy process.

`apfel_status` takes no request. It returns this object:

```ts
type ApfelStatus = {
  supported: boolean;
  available: boolean;
  reason: string | null;
  model: string | null;
  version: string | null;
  context_window: number | null;
  prewarmed: boolean | null;
  supported_languages: string[];
};
```

`supported` is false when the current system cannot run the bundled provider.
`available` is false when Apple Intelligence cannot load its model.

Call `apfel_generate` with one `request` object:

```ts
type ApfelGenerateRequest = {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  response_format?:
    | { type: "json_object" }
    | { type: "json_schema"; name: string; schema: object };
};
```

The command returns the generated text and the token counts:

```ts
type ApfelGeneration = {
  text: string;
  finish_reason: string;
  model?: string;
  cost_usd?: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};
```

The command rejects its promise when Apple Intelligence is unavailable or
generation fails. The error keeps the message from the apfel OpenAI-compatible
response.

## Understand the sidecar lifecycle

Rust starts one apfel server on a free loopback port when a command first needs
it. The server accepts one generation request at a time.

Rust creates a new bearer token for each server process. It passes the token
through `APFEL_TOKEN`, not through a command argument.

The WebView cannot start shell commands or call the server directly. It uses
only the two Tauri commands. Rust checks the current process before each use
and replaces it when the health request fails. It stops the child process when
the backend exits.

The bundle contains apfel v1.9.1 and its MIT license. The preparation script
makes sure that the downloaded archive and extracted binary match pinned
SHA-256 checksums.

Run the ignored live integration test on a supported Mac:

```sh
APFEL_BIN="$PWD/binaries/apfel-aarch64-apple-darwin" \
  cargo test --test apfel live_apfel_serves_a_completion_through_the_rust_client \
  -- --ignored --exact
```
