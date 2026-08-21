---
title: Desktop speech providers and the audio player
description: One interface for every voice, an audio player for the files, and a file name that is the hash of the speech settings and the normalized text.
status: plan, not approved
---

# Desktop speech providers and the audio player

This is phase 2 of [the spaces and Talk plan](2026-08-21-desktop-spaces-talk.md).
Phase 1 speaks with the voice of the operating system only.

## Goal

Give the desktop app the ElevenLabs voice, behind an interface that every
voice uses. Keep each spoken file, and name it so that the same words with the
same settings never go to the service twice.

## Scope

In: the interface, the two voices, the audio player, the file cache, the
fallback, and the Voice screen.

Out: streaming for low delay, word highlighting, and a rule that erases old
audio. Each one has a note at the end.

## The interface

`src/speech.ts` holds one interface. A screen never knows which voice speaks.

```ts
export type VoiceService = "system" | "elevenlabs";

export interface SpeechSettings {
  provider: VoiceService;
  voiceId: string | null;
  modelId: string;
  stability: number;
  similarity: number;
  speed: number;
}

export interface SpeechProvider {
  readonly id: VoiceService;
  /** Speaks one sentence. It resolves when the sound stops. */
  speak(text: string): Promise<void>;
  /** Stops the sound now. */
  stop(): void;
}

export function providerFor(settings: SpeechSettings): SpeechProvider;
```

| Provider     | How it speaks                                                  |
| ------------ | -------------------------------------------------------------- |
| `system`     | `SpeechSynthesisUtterance` in the WebView. No file, no key.     |
| `elevenlabs` | Rust makes a file. The audio player plays it.                   |

The settings live in the `speech` setting. The Voice screen writes it. On the
first run the setting does not exist, so `speech.ts` builds it from the
`services` setting that setup wrote, and from the default numbers.

## The audio player

`src/player.ts` owns one `HTMLAudioElement`, at the module level.

```ts
export function play(source: string): Promise<void>;
export function stop(): void;
export function usePlayer(): { playing: boolean; source: string | null };
```

`usePlayer` reads the module state through `useSyncExternalStore`. The Talk
screen shows which message is speaking, and the composer knows when the sound
stops.

One element at a time. A new sentence stops the sentence before it, the same
rule that the system voice already uses.

Rust writes the file into the application data directory. The WebView reads it
through the Tauri asset protocol, with `convertFileSrc`. The scope of the
protocol is the audio directory and nothing else. The content-security policy
already permits `asset:` for media.

## The file name

A voice file is named for what makes its sound:

```
audio/<64 hex characters>.mp3
```

The hash is SHA-256 over one line, in this order:

```
<provider>|<voiceId>|<modelId>|<stability>|<similarity>|<speed>|<normalized text>
```

The three numbers are written with three decimal places, so `0.5` and `0.50`
give one name.

The text is normalized in one place, in Rust:

1. Remove the space at the start and at the end.
2. Make each run of space characters one space.

The text is not made lower case, and its punctuation stays. Both change how a
voice reads a sentence, so both belong to the sound.

The same words with the same settings therefore give the same file. Rust
returns that file and calls no service. A changed voice, a changed number, or
a changed word gives a new name and a new call.

Rust writes to a temporary name first, then renames. A stopped application
therefore leaves no half-written file under a name that says it is complete.

## The Rust surface

| Command             | Request              | Response                     |
| ------------------- | -------------------- | ---------------------------- |
| `speech_synthesize` | `{ text, settings }` | `{ path, from_cache }`       |

The command rejects when no ElevenLabs key is stored, and when the service
fails. The key stays in the Keychain, and the response never carries it.

`sha2` joins the Rust dependencies. No crate in the backend hashes today.

## When the cloud voice fails

A user who cannot speak must not meet silence. `elevenlabs.speak` catches every
failure and speaks with the system voice instead. The screen shows a short
line that says which voice spoke, and why.

This is the one place where the plan adds code that a happy path does not need.

## No path on a message

A message holds its words, not a file.

The hash is the index. A message that plays again goes through the same
`speak(text)` path, and Rust returns the file it made before. A stored path
would be a second index that can disagree with the first, and it would hold
the file of an old voice for ever.

A message spoken with an old voice therefore plays with the new voice after a
change. For an app that speaks for its user, the current voice is the right
one.

`audio_path` leaves the TypeScript `Message` type, and `src/data.ts` never
writes it. The SQLite column belongs to the backend schema, so removing the
column is a separate decision for whoever owns `repository.rs`. An empty
column costs nothing until then.

## The Voice screen

`/voice` already has a place in the sidebar and shows a placeholder. It becomes
the one screen for the voice. The web app makes the same choice: its
`/settings/voice` route only sends the user to `/voice`.

The screen has three parts:

1. **The service.** System voice, or ElevenLabs. ElevenLabs shows its
   connection state, and sends the user to Settings when no key is stored.
2. **The voice.** The list from `provider_voices`, with the public sample for
   each one. The sample plays through the audio player, so it needs no key and
   no speech call. The setup step already does this, and the screen uses the
   same shape.
3. **The sound.** Three sliders: speed, stability, and similarity. Each one has
   a low label and a high label, as the web app has.

A **Try it** button speaks one short sentence with the settings on the screen.
This is the only way a user can hear a change before a real message.

Every change writes the `speech` setting. The fingerprint holds all six values,
so a changed slider makes a new file and the old files stay valid for the old
settings.

## Files

| File                    | Change                                          |
| ----------------------- | ----------------------------------------------- |
| `src-tauri/src/speech.rs` | New. Normalize, hash, cache, and call the service. |
| `src-tauri/src/rpc.rs`  | New `speech_synthesize` command.                |
| `src-tauri/src/providers.rs` | The ElevenLabs request for text to speech. |
| `src-tauri/tauri.conf.json` | Turn on the asset protocol for the audio directory. |
| `src/speech.ts`         | The interface, the two providers, and the fallback. |
| `src/player.ts`         | New. The audio element and its state.           |
| `src/talk.tsx`          | Show which message speaks. Add a stop control.  |
| `src/voice.tsx`         | New. The Voice screen.                          |
| `src/main.tsx`          | `/voice` shows the screen, not the placeholder. |
| `src/components/ui/slider.tsx` | New, from the shadcn command line.       |

## Steps

Each step starts with a failing test.

| Step | Content                                                       | Size     |
| ---- | ------------------------------------------------------------- | -------- |
| 1    | Rust: normalize and hash, with the file-name tests            | 2 hours  |
| 2    | Rust: the ElevenLabs call, the cache, and the command         | 4 hours  |
| 3    | Turn on the asset protocol, with its scope                    | 1 hour   |
| 4    | `src/player.ts` and its state                                 | 2 hours  |
| 5    | The interface, the two providers, and the fallback            | 3 hours  |
| 6    | Talk shows the speaking message and can stop it               | 2 hours  |
| 7    | The `speech` setting, and its fallback to `services`          | 1 hour   |
| 8    | The Voice screen: the service and the voice list              | 4 hours  |
| 9    | The three sliders and the Try it button                       | 4 hours  |

About three and a half days.

## Skipped, and when to add it

- **Streaming.** The web app opens a WebSocket and plays the first sound
  before the sentence is complete. Add it when the wait for a long sentence
  troubles a user.
- **Word highlighting.** ElevenLabs returns the time of each word. Add it with
  the display window, which is the surface that needs it.
- **A rule that erases old audio.** One sentence is some tens of kilobytes, so
  a year of talk is small. Add a rule when the directory passes a size that a
  user notices.
- **The choice of the output device.** Add it with the display window, which is
  the reason to send sound to another device.
