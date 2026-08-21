---
title: Desktop spaces, messages, and Talk
description: The architecture for the port of the spaces list, the message store, and the Talk screen into the independent desktop app.
status: architecture, not approved
---

# Desktop spaces, messages, and Talk

This document plans the architecture only. It does not list the steps of the
implementation. A second document will do that after approval.

## Goal

Give the desktop app a space list and a Talk screen. A user opens a space,
builds a sentence, and hears the app speak it. The spoken sentence stays in the
transcript of that space.

## What exists now

The Rust backend already stores spaces, messages, and notes in SQLite. It has
list, get, put, and delete commands for each of the three domains. It holds the
cloud keys in the macOS Keychain, and it generates text with the local apfel
model.

The React app has the setup flow, the application shell, and five routes. Four
of the five routes show a placeholder. `/spaces` is one of them.

The web app has the complete feature. It is much larger than the target: the
Talk screen alone is 774 lines, and it depends on the spaces, suggestions,
speech, audio, editor, and notes packages. The desktop app must not import that
code. It ports the behavior deliberately.

## Layers

The desktop app gets three layers. Each layer has one job.

| Layer      | Files                              | Job                                       |
| ---------- | ---------------------------------- | ----------------------------------------- |
| Rust       | `src-tauri/src/*`                  | Storage, secrets, and network calls       |
| Modules    | `src/data.ts` `src/speech.ts` `src/ai.ts` `src/os.ts` | The only callers of `invoke` |
| React      | `src/routes/*` `src/talk/*`        | Screens and components                    |

A component must not call `invoke`. This rule already applies to `src/os.ts`,
and the new modules keep it.

## Decisions

### D1 — TanStack Query holds the rows

`src/data.ts` wraps the domain commands of Rust. It exports one query hook and
one mutation hook for each list that a screen needs. React Query holds the
cache, the loading state, and the error state.

| Key                      | Command        |
| ------------------------ | -------------- |
| `["spaces"]`             | `space_list`   |
| `["messages", spaceId]`  | `message_list` |
| `["phrases", spaceId]`   | `phrase_list`  |

A mutation writes through Rust. Then it makes its key invalid. The Speak
mutation also writes the new message into the cache first, so the transcript
shows the sentence before the disk write is complete.

This adds `@tanstack/react-query`. The web app uses the same library, so the
shape of the code is familiar in both applications.

Skipped: TanStack DB and the collections of the web app. The desktop app reads
SQLite through Rust, so it needs no second local store.

### D2 — The login name of the operating system is the user id

Rust needs a `user_id` on a space and on a message. Desktop setup makes no
account, so the operating system supplies the identifier.

The existing `user_name` command returns the display name, for example
`Ravi Atluri`. That name can be empty, it can hold a space, and the user can
change it in setup. It cannot be an identifier. A new `user_id` command returns
the login name from `whoami::fallible::username()`, for example `ravi`.

The identifier is decided one time:

1. Setup reads the login name through `src/os.ts`, next to `osName`.
2. The last step keeps it in the `setup` setting, beside the name and the mode.
3. Every later launch reads the identifier from that setting.

The app must not ask the operating system again after the first run. A user who
renames the account of the Mac keeps the spaces and the messages.

If the command fails, `src/os.ts` uses the constant `"local"`. The setting then
keeps `"local"`, so the identifier stays the same on every later launch.

`currentUserId()` in `src/os.ts` is the only reader. The app guard already
makes sure that setup is complete before an app screen opens, so the identifier
always exists when Talk asks for it.

### D3 — Slug routes, the same shape as the web app

```
/spaces                     the space list
/spaces/$slug/talk          Talk in one space
```

The slug comes from the title of the space. The route resolves the slug against
the loaded spaces, so no identifier is in the URL. The `/talk` segment stays in
the path, so a Notes mode can join later and no URL changes.

Skipped: the last-mode memory and the `/spaces/$slug` redirect that the web app
uses. Both rules need two modes. Add them with Notes.

### D4 — Speech splits by service

Setup already stores the choice of the user in the `services` setting. The two
choices need two different paths.

| Choice        | Path                                                     |
| ------------- | -------------------------------------------------------- |
| System voice  | `window.speechSynthesis` inside the WebView. No Rust.     |
| ElevenLabs    | A new Rust command. The key stays in the Keychain.        |

The WebView on macOS supports the Web Speech API, so the system voice needs no
Rust code and moves no audio bytes.

The ElevenLabs key must not enter the WebView. Rust calls the service and
returns the audio as base64. React makes an object URL and plays it with one
`<audio>` element.

`src/speech.ts` holds the branch. The rest of the app calls one `speak(text)`
function.

### D5 — Do not store the audio in the first pass

The `audio_path` column stays empty. A tap on a message in the transcript
speaks the text again.

Stored audio needs a file directory, a cleanup rule, and a cache. The first
pass does not need them. Add stored audio when the delay or the cost of a
second synthesis becomes a problem.

### D6 — Saved phrases need one more table

The suggestion stripes read the saved phrases of the space. Rust has no table
for them. Schema version 2 adds `saved_phrases` with the same columns as the
web app, and four commands.

### D7 — Writing help goes through Rust

`apfel_generate` already covers the local model. OpenRouter needs a command of
the same shape, because the key stays in Rust.

`src/ai.ts` reads the `services` setting, picks the service, and gives the app
one `generate()` function. A user with no writing help gets no suggestions from
a model, and the phrases and the history still work.

### D8 — The Talk screen is one component with three parts

```
+-------------------------------------------+
|  header: space title                      |
+-------------------------------------------+
|  transcript: spoken messages, newest last |
|              paged, 8 for each page       |
+-------------------------------------------+
|  working set: pinned phrase rows          |
|  composer:  suggestion stripes            |
|             text area                     |
|             undo, delete word, clear      |
|             Speak                         |
+-------------------------------------------+
|  dock: space tabs, new space              |
+-------------------------------------------+
```

The header, the transcript, and the composer come from the web Talk screen. The
`Screen` component of `src/shell.tsx` already gives the header.

### D9 — The dock switches spaces

The bottom dock of the web app holds space tabs on the left and the mode group
on the right. The desktop app ports the tabs and the new-space button. The mode
group waits for Notes.

### D10 — Skip the right rail in the first pass

The rail of the web app has three tabs: Phrases, Voice, and Display. Phrases
arrives with the saved phrases. Voice belongs in the Settings screen. Display
is a second window. None of the three belongs in the first pass.

## The Rust surface after the port

The commands below are new. Every other command already exists.

| Command                | Request                        | Response            | Phase |
| ---------------------- | ------------------------------ | ------------------- | ----- |
| `user_id`              | none                           | `string`            | 1     |
| `phrase_list`          | `{ space_id }`                 | `SavedPhrase[]`     | 3     |
| `phrase_put`           | `SavedPhrase`                  | `SavedPhrase`       | 3     |
| `phrase_delete`        | `{ id }`                       | `boolean`           | 3     |
| `speech_synthesize`    | `{ text, voice_id }`           | `{ audio, mime }`   | 2     |
| `openrouter_generate`  | The apfel request shape        | The apfel response  | 4     |

`user_id` rejects its promise when the system knows no login name.

`speech_synthesize` rejects its promise when no ElevenLabs key is stored. The
response carries base64 audio, never a key.

## Phases

Each phase ends with a working app. A phase has its own tests, and the tests
come first.

| Phase | Content                                                              | Size     |
| ----- | -------------------------------------------------------------------- | -------- |
| 1     | `user_id`, space list, space CRUD, transcript, composer, Speak with the system voice | 1 day |
| 2     | ElevenLabs voice through Rust, and replay of a message               | half day |
| 3     | Saved phrases, suggestion stripes, phrase codes                      | 2 days   |
| 4     | Title and context of a space from a model, after the first message   | half day |

Phase 1 is a complete vertical slice. A user can talk with it.

The approved scope is phase 1. Phases 2 to 4 wait for a review of phase 1.

## Risks

- The suggestion stripes of the web app measure text to scale the tiles. That
  code uses a package that the desktop app does not have. Phase 3 must decide
  between the package and a simpler rule.
- The Rust work for spaces, messages, and notes is complete but not committed.
  Phase 1 depends on it.
- Apple Intelligence is not available on every Mac. A model that is not there
  must degrade to the phrases and the history, not to an error.
