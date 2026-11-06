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

`cargo test` does not run the two tests that change the system. Run each one
by name.

The native window test opens temporary windows with separate application
identifiers. It shows the panel, then sets its size and position. After a quit,
it reads the same values. A second run closes the panel and makes sure that the
panel is hidden and the process still runs:

```sh
cargo test --test window_state
```

The microphone test publishes `September Microphone` as a system input, then
removes it:

```sh
cargo test --test virtual_microphone
```

Use `pnpm tauri:dev` or `pnpm tauri:build` from `apps/desktop` to run or package
the complete application.

To test window persistence on macOS:

1. Open the app, then move and resize the panel.
2. Record the size and position of the panel.
3. Quit the app with Quit September in the menu bar item.
4. Open the app again.
5. Make sure that the size and position of the panel match the recorded values.

The Tauri product and the panel are named `September`. The default capability
lets the UI replace the native window title after navigation, so each page adds
its name to the app name.

The panel has no title bar. The title bar is an overlay, and the window buttons
sit over the indigo header. The header drags the window, so the capability
allows `core:window:allow-start-dragging`.

`create_panel` in `src/window.rs` makes the panel from its entry in
`tauri.conf.json`, which has `create: false`. Only the builder gives the webview
the place of the window buttons. AppKit lays out the title bar again after the
window shows, so `september_window_buttons` in `native/window.m` puts the
buttons back on each update of the window.

The `tauri-plugin-window-state` plugin saves window size and position on exit.
It restores these values on launch from `.window-state.json` in the application
configuration directory. If the saved position is outside every connected
monitor, the operating system chooses the position.

The Tauri commands prepare apfel automatically on an Apple Silicon Mac.
Run `pnpm apfel:prepare` from `apps/desktop` to prepare only the sidecar.

## Show the panel

`tauri.conf.json` creates one window, `panel`. It starts hidden, and the UI
shows it at boot.

| Label   | Size     | Minimum | Other                                                                     |
| ------- | -------- | ------- | ------------------------------------------------------------------------- |
| `panel` | 834×1194 | 400×560 | `alwaysOnTop`, `visibleOnAllWorkspaces`, `skipTaskbar`, title `September` |

The default capability covers the `panel` label. `src/window.rs` holds the
panel commands:

| Command           | Arguments  | Result                                                                                                                       |
| ----------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `panel_show`      | none       | Shows and focuses the panel. The activation policy does not change.                                                          |
| `panel_hide`      | none       | Hides the panel.                                                                                                             |
| `panel_float`     | none       | Returns `false` only when the user turned the float off.                                                                     |
| `panel_set_float` | `on: bool` | Saves the choice, then applies it to the panel and to the activation policy.                                                 |
| `panel_setup`     | `on: bool` | On: a normal window with the `Regular` policy. The saved choice does not change. Off: applies the saved float choice.        |
| `panel_present`   | `on: bool` | On: `set_simple_fullscreen(true)`. Off: `set_simple_fullscreen(false)`.                                                      |

`window.rs` reads and writes the `panel-float` setting through
`BackendState::setting` and `BackendState::put_setting`.

`lib.rs` handles `WindowEvent::CloseRequested` for `panel`. It prevents the
close and hides the panel, so the draft and the close guard stay. Quit still
stops speech, the microphone, and gaze on `RunEvent::Exit`.

On macOS, `RunEvent::Reopen` comes from a click on the Dock icon. The handler
shows the panel.

### The Dock icon

`policy(setup, float)` is a pure rule with its own `Policy` enum. A unit test
reads it.

| Setup  | Float | Policy      | Result                                       |
| ------ | ----- | ----------- | -------------------------------------------- |
| On     | Any   | `Regular`   | A Dock icon and a place in Command-Tab       |
| Off    | On    | `Accessory` | No Dock icon and no place in Command-Tab     |
| Off    | Off   | `Regular`   | A Dock icon and a place in Command-Tab       |

`apply_float` maps `Policy` to the Tauri `ActivationPolicy` on macOS. It sets
the float on the panel only when the float is on and setup is off. As a
result, `panel_setup(true)` also turns off always-on-top, all desktops, and the
floating level.

### The menu bar item and the global key

`window::setup` runs after `rpc::setup`. It applies the saved float choice. It
adds a tray icon with the `icons/tray.png` keycap as a template image. The tray
menu holds Show Panel and Quit September. The `tauri` crate needs the
`tray-icon` and `image-png` features for this.

The same setup registers Control-Option-Space through
`tauri-plugin-global-shortcut`. The crate is pinned to `~2.3`, because 2.4
needs a newer `tauri`. A press shows the panel. If the panel is visible and is
the key window, the press hides it. `panel_toggle` holds this rule, and a unit
test reads it. If another app owns the key, the registration fails and the
app logs the reason.

### Float over a full-screen app

`native/window.m` holds `september_window_float(void *nsWindow, bool on)`.
When `on` is true, it adds `NSWindowCollectionBehaviorFullScreenAuxiliary` and
`NSWindowCollectionBehaviorCanJoinAllSpaces` to the window, and it sets the
level to `NSFloatingWindowLevel`. When `on` is false, it removes the two
behaviors and sets the level to `NSNormalWindowLevel`. `build.rs` compiles the
file with ARC and links AppKit.

The `panel-float` setting holds the choice of Settings > Panel. The float is on
until the user turns it off. `float_on` holds this default rule, and a unit
test reads it.

Present uses `set_simple_fullscreen` through `panel_present`. It fills the
screen without a new macOS desktop, so it works with the floating window level.

The panel is a normal Tauri window, not a nonactivating `NSPanel`. A click in
the panel makes September the active app. See
[the floating panel](../../../docs/concepts/desktop-floating-panel.md).

## Understand storage

Rust opens `september.sqlite3` in Tauri's application-local-data directory.
The `settings` table stores a unique text key and a JSON value. Keys must
contain 1 to 256 bytes. The `audio-output` setting keeps the Core Audio UID for
September's own playback device.

The `spaces`, `messages`, `agent_messages`, `notes`, and `saved_phrases` tables
store domain fields in typed columns. Talk messages and notes can belong to a
space. Every Agent message belongs to one space. Deleting a space deletes its
Talk transcript, Agent transcript, and scoped notes, while global Talk
messages and notes remain. Timestamps are Unix milliseconds.

The `analytics_events` table stores one indexed event type and timestamp with
a JSON payload. It has no foreign key to a space, because a retained usage
total must survive when the user deletes a conversation.

`MIGRATIONS` in `src/repository.rs` pairs each schema version with its file in
`migrations/`. The name of the file starts with the version. When Rust opens
the database, it applies each step above the `user_version` of the database.
Versions 1 to 3 held only the settings table, so the first step is 4.

To change the schema, add a file with the next version and add it to
`MIGRATIONS`. Do not change a file that a release applied.

## Call the domain APIs

Each domain command accepts a `request` object. A `put` command inserts or
replaces one complete row and returns the stored object. A `get` command
returns `null` when its row does not exist. A `delete` command returns `false`
when its row does not exist.

| Command              | Request                                        | Response          |
| -------------------- | ---------------------------------------------- | ----------------- |
| `space_list`         | `{ user_id }`                                  | `Space[]`         |
| `space_get`          | `{ id }`                                       | `Space \| null`   |
| `space_put`          | `Space`                                        | `Space`           |
| `space_delete`       | `{ id }`                                       | `boolean`         |
| `message_list`       | `{ space_id? }`                                | `Message[]`       |
| `message_get`        | `{ id }`                                       | `Message \| null` |
| `message_put`        | `Message`                                      | `Message`         |
| `message_delete`     | `{ id }`                                       | `boolean`         |
| `note_list`          | `{ space_id? }`                                | `Note[]`          |
| `note_get`           | `{ id }`                                       | `Note \| null`    |
| `note_put`           | `Note`                                         | `Note`            |
| `note_delete`        | `{ id }`                                       | `boolean`         |
| `phrase_list`        | `{ space_id? }`                                | `SavedPhrase[]`   |
| `phrase_put`         | `SavedPhrase`                                  | `SavedPhrase`     |
| `phrase_delete`      | `{ id }`                                       | `boolean`         |
| `phrase_replace_ai`  | `{ space_id, phrases }`                        | `SavedPhrase[]`   |
| `agent_message_list` | `{ space_id }`                                 | `AgentMessage[]`  |
| `agent_message_put`  | `AgentMessage`                                 | `AgentMessage`    |
| `agent_tool_state`   | `{ id, expected, state, content, updated_at }` | `AgentMessage`    |

Agent messages have their own table and API. `agent_tool_state` resolves a
pending tool record only when its current state matches `expected`, so a second
approval cannot apply the same proposal again.

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

Rust keeps only the checks that the database needs. The WebView checks the
values of each field.

- An ID, a user ID, and a setting key contain 1 to 256 bytes.
- A message type, an agent role, a phrase kind, and phrase text are not empty.
- A timestamp and `phrases_synced_count` are not negative.
- A scoped row refers to a space that exists.

Deleting a space also deletes its scoped Talk messages, Agent messages, and
notes. Global Talk messages and notes remain. For example, this call creates
or replaces a space:

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

`analytics_put` stores a local event. `analytics_list` returns the events of
one user in an inclusive timestamp range, newest first.

| Command          | Request                         | Response           |
| ---------------- | ------------------------------- | ------------------ |
| `analytics_put`  | `AnalyticsEvent`                | `AnalyticsEvent`   |
| `analytics_list` | `{ user_id, start_at, end_at }` | `AnalyticsEvent[]` |

```ts
type AnalyticsEvent = {
  id: string;
  user_id: string;
  event_type: string;
  timestamp: number;
  data: Record<string, unknown>;
};
```

The repository deletes events strictly older than 90 days before each usage
read, after each usage write, and before each backup export. The timestamp
index keeps cleanup and bounded reports out of the event payload.

## Call the settings API

Each command accepts a `request` object.

| Command       | Request          | Response             |
| ------------- | ---------------- | -------------------- |
| `setting_get` | `{ key }`        | JSON value or `null` |
| `setting_put` | `{ key, value }` | Stored JSON value    |

## Call the backup API

| Command         | Request                       | Response                              |
| --------------- | ----------------------------- | ------------------------------------- |
| `backup_export` | none                          | Portable settings and all domain rows |
| `backup_import` | `{ request: BackupContents }` | none                                  |

`BackupContents` holds the rows of each table and the portable settings:

```ts
type BackupContents = {
  settings: Record<string, unknown>;
  spaces: Space[];
  messages: Message[];
  agentMessages: AgentMessage[];
  notes: Note[];
  savedPhrases: SavedPhrase[];
  usageEvents: AnalyticsEvent[];
};
```

`settings` uses the stored setting names as keys, for example `panel-open`.
`PORTABLE_SETTING_KEYS` in `src/repository.rs` lists the portable keys. Export
leaves out a portable key that has no value. It also leaves out the Keychain
keys, the selected audio output, and every other setting of this Mac. The
WebView changes `settings` into the settings of the backup file, and back.

`backup_import` refuses a setting key that is not portable. It replaces the
portable settings and every row in one transaction. If an ID repeats, a row
refers to a space that is not in the backup, or a write fails, the current
database stays.

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

September borrows two cloud services: OpenRouter for AI Assistance, and
ElevenLabs for a voice. Each key lives in the macOS Keychain, under the service
name `com.september.desktop`. The account is `openrouter` or `elevenlabs`.

The backend reads both accounts once during startup and keeps their keys in
process memory. Provider commands read this cache, not the Keychain. A connect
or forget command updates the Keychain and the cache together.

A key never returns to the WebView. Every command answers with a status only.

| Command                   | Request             | Response                                   |
| ------------------------- | ------------------- | ------------------------------------------ |
| `provider_status`         | none                | One status for each service                |
| `provider_connect`        | `{ provider, key }` | The status after the test                  |
| `provider_forget`         | `{ provider }`      | `boolean`                                  |
| `provider_voices`         | none                | The ElevenLabs voices                      |
| `provider_clone_voice`    | raw multipart audio | `{ id }`                                   |
| `provider_models`         | none                | The ElevenLabs speech models               |
| `provider_writing_models` | none                | Every OpenRouter model                     |
| `provider_quota`          | none                | The current ElevenLabs allowance or `null` |

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
cannot be lost by a model. Rust refuses a replacement row that says it is
pinned, or that belongs to another space.

`phrase_list` without a space returns every row, because a code works in every
space.

## Generate text with a cloud model

The WebView writes with a typed model client, so Rust serves it rather than
calling for it. `writing_proxy` starts a loopback proxy on the first call and
answers with `{ baseUrl, token }`. The proxy binds `127.0.0.1` on a free port
and serves `POST /v1/chat/completions`. It requires the run token in
`Authorization`, swaps that token for the OpenRouter key from the Keychain,
and forwards the body to OpenRouter unchanged. The reply goes back byte for
byte, so a streamed answer streams.

The token lasts one run and means nothing to another process. A request
without the token gets `401`. A body that is not a JSON object gets `400`.
Every other path gets `404`. The WebView names the model in each request, and
Rust adds no field.

The proxy also serves the model on this Mac, at `POST
/apple/v1/chat/completions`. The sidecar allows only a loopback origin, and
the WebView is not one. The sidecar also holds its own token. The proxy starts
the sidecar on first use, and swaps the run token for the token of the
sidecar. If the Mac cannot run Apple Intelligence, or the model is not
available, the request gets `502` with the reason.

The TypeScript service selects the model before it calls. It uses the default
model settings for all jobs except Suggestions. If the Suggestions override is
not null, Suggestions use it.

`provider_writing_models` gives the models the user can choose. Each row has
`free`, which is true when a prompt token and a completion token both cost
zero. A model with no price is not known to be free, so `free` is false. The
WebView puts the rows in order.

## Speak a sentence

The `speech_synthesize` command takes `{ text, voice }` and returns
`{ path, from_cache }`:

```ts
type VoiceSettings = {
  voiceId: string;
  modelId: string;
  stability: number;
  similarity: number;
  speed: number;
};
```

The WebView resolves each value before it calls, for example the model of the
Dialogue voice and the stability of Eleven v3. Rust sends the values as they
are.

Rust names the file from the SHA-256 of the voice settings and the normalized
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

| Command              | Request                      | Response               |
| -------------------- | ---------------------------- | ---------------------- |
| `audio_outputs`      | none                         | `{ uid, name }[]`      |
| `audio_output`       | none                         | The UID September uses |
| `audio_output_set`   | `{ uid }`                    | none                   |
| `speech_system`      | `{ text, voice_id?, speed }` | none                   |
| `speech_stream`      | `{ text, voice, dialogueParts? }` | `{ from_cache, latency_ms, interrupted }` |
| `speech_native_stop` | none                         | none, or rejects       |

`audio_output_set` verifies the device and saves its UID without changing the
macOS sound output. If the saved device is absent, `audio_output` returns the
current macOS output until the saved device returns.

`speech_system` receives buffers from `AVSpeechSynthesizer`.
`speech_stream` gets the MP3 file of the ElevenLabs voice over HTTP with the
stored key, and plays the file. For the Dialogue voice, it schedules each chunk
of 16-bit samples as the chunk arrives. Both commands feed
an `AVAudioPlayerNode` in a September-owned `AVAudioEngine`. The engine's
output audio unit uses the selected device.

Every September engine turns off the input side of its I/O unit, turns the
output side on, and then selects its output device by ID. On macOS, one unit
runs both sides, and an engine left alone also opens the default input. If
that input cannot run, for example an aggregate device with a missing member,
the engine starts but plays nothing, and `play` fails with "player did not see
an IO cycle". The keepalive engine of the virtual microphone selects the
default output in the same way.

The voices share one speech engine while the output stays the same. A
sentence after another sentence starts about 25 ms sooner, because the engine
is already running. A stop ends the sound of the player node and keeps the
engine. A new output gets a new engine. An engine that stopped also gets
replaced, for example after a device change. Each voice connects the node to
the mixer in the format of its own sound. After 30 seconds without a sentence,
the engine stops, so a Bluetooth output is not held open.

`StartSpeechEngine` catches Objective-C exceptions during preparation and startup
and returns their details through the speech error path. A failed stream startup
stops its engine and clears the active stream before it returns an error.
`cargo test --test speech_startup` injects a playback exception and checks the
returned error and engine shutdown. This test requires a macOS sound output
and plays no samples.

Each sentence of `speech_stream` gets a number from `audio::claim_speech`.
A stop, or a newer sentence, raises the number. The native side plays a file
or opens a stream only for the current number, so a stop that arrives just
before the sound begins keeps the sentence silent. Each native voice watches
its engine for `AVAudioEngineConfigurationChangeNotification`. If the output
changes after the sound began, the sentence ends as interrupted. If a voice
file is not audio, `audio::play_speech_file` removes it, so the next request
asks ElevenLabs again. `cargo test --test speech_playback` covers these cases
without sound.

When the request has `dialogueParts`, `speech_stream` speaks the sentence in
the Dialogue voice. The WebView splits the text into the parts.
`Providers::speak_dialogue` sends each part to the Text to Dialogue stream,
and Rust gives each chunk of samples to the same engine. The first sound can
take 10 seconds. For `eleven_v3_conversational`, all parts go through the Text
to Dialogue socket.

Rust keeps a complete Dialogue sentence as a WAV file, under the same SHA-256
name as the MP3 file. A kept file plays without a request. If Rust cannot
write the WAV file, it logs the reason, and the sentence still counts as
spoken.

If the stream fails before the first sound, the command rejects. The WebView
then speaks the sentence in the system voice. If the stream fails after the
first sound, the sound stops and `interrupted` holds the reason.
`speech_native_stop` also cancels the stream, and the stopped command resolves
with no reason. If the stream task panics, the command rejects.

## Publish the virtual microphone

The native bridge publishes `September Microphone` as a public Core Audio
aggregate input. It contains one mono process tap for September audio.

| Command                     | Request | Response                        |
| --------------------------- | ------- | ------------------------------- |
| `virtual_microphone_status` | none    | `{ active, name, uid, detail }` |
| `virtual_microphone_start`  | none    | `{ active, name, uid, detail }` |
| `virtual_microphone_stop`   | none    | `{ active, name, uid, detail }` |

The microphone starts only after the user enables it. The first start uses the
`NSAudioCaptureUsageDescription` message from `Info.plist`. The app destroys
the aggregate device and its process tap when the user stops it or quits.

The bridge also removes a stale aggregate device during application startup.
This cleanup handles an earlier process that ended before normal shutdown.
The feature requires macOS 14.2 or later and does not install a system driver.
On macOS 26 the tap also names its own bundle and asks the system to restore it
when September restarts. An older system cannot answer those two questions, so
`native/audio.m` sets them behind an availability check and keeps the tap.

`virtual_microphone_status` returns a `detail` while the microphone runs. macOS
publishes no way to read the answer to its audio-recording question, so a
refused tap is silent and reports nothing. The message names the one setting
that mends it.

Both native voices wait for the audio engine to play their final buffer, not on
a clock. `speech_stop` stops the engine and releases that wait.

## Stream the eye-tracker test bed

The optional `/eyetracker` test bed captures 1280×720 frames through
AVFoundation and asks Apple Vision for one face, both eye outlines, and both
pupils. Rust converts each pupil into its eye-relative position, rejects closed
or low-confidence eyes, and applies a small low-pass filter. Late frames are
discarded, and analysis is limited to about 15 frames per second. Rust pads the
detected face box into a 16:9 crop and smooths crop movement before it makes the
preview.

| Command      | Request                           | Response |
| ------------ | --------------------------------- | -------- |
| `gaze_start` | `{ onEvent: Channel<GazeEvent> }` | none     |
| `gaze_stop`  | none                              | none     |

The channel receives status events and a 320-pixel-wide RGBA face crop at no
more than five frames per second. Each frame includes the current smoothed
point when both eyes are valid. The WebView takes median samples at four box
corners and fits one linear mapping for each axis. It clips the mapped point to
the camera box. It does not convert it to a window or operating-system pointer.

Neither side saves the preview, point, or calibration. `gaze_stop` joins the
capture thread. The capture thread stops by itself after an error, and the
next `gaze_start` starts a new one. Leaving the page and application exit use the same stop path.
The app requests camera access only after `gaze_start`; `Info.plist` explains
the use and the signed app has the camera entitlement.

## Use the apfel API

`apfel_status` starts the sidecar when it is not running. Later calls use the
same process while it is healthy. The command takes no request and returns
this object:

```ts
type ApfelStatus = {
  supported: boolean;
  available: boolean;
  reason: string | null;
};
```

`supported` is false when the current system cannot run the bundled provider.
`available` is false when Apple Intelligence cannot load its model. Text from
Apple Intelligence goes through the writing proxy.

## Understand the sidecar lifecycle

Rust starts one apfel server on a free loopback port when the status command
or the proxy first needs it. The server accepts one generation request at a
time.

Rust makes a new bearer token for each server process. It passes the token
through `APFEL_TOKEN`, not through a command argument.

The WebView cannot start shell commands or call the server directly. Rust
checks the current process before each use and replaces it when the health
request fails. It stops the child process when the backend exits.

The bundle contains apfel v1.12.0 and its MIT license. The preparation script
makes sure that the downloaded archive and extracted binary match pinned
SHA-256 checksums.

## OpenRouter authorization

`oauth.rs` implements `openrouter_connect` and `openrouter_cancel`. A request
identifier scopes cancellation. The callback binds IPv4 loopback on an OS-assigned
port and requires a random path. PKCE uses S256; authorization codes and verifiers
stay in Rust. Only a checked key reaches `ProviderKeys::store`. The command
returns a provider status, never the key. Cancellation and a five-minute timeout
drop the callback listener and pending exchange.
