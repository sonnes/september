---
title: Desktop persistence
description: The Tauri app keeps records in SQLite and file bytes in regular files behind Rust commands.
package: shared, sync, audio
---

# Desktop persistence

The desktop app uses the same React routes and components as the web app. A Tauri build changes the persistence adapter and local AI registry.

## Read and write records

TanStack Query gives components one data contract. Browser queries read IndexedDB. Desktop queries call typed TypeScript clients that invoke Rust commands.

Rust validates each request and stores records in SQLite. Record writes also create durable outbox entries for cloud-synced collections.

Rust change events name the affected collections. The shared query provider invalidates only the related query-key prefixes.

## Store file bytes

Rust stores file bytes under Tauri's application-local-data directory. SQLite stores the media type, size, timestamps, and generated file ID.

The webview cannot submit a storage path. It writes bytes and receives an opaque ID.

Audio features still use stable logical names. An `audio-file-aliases` record maps each logical name to its Rust file ID.

Generated exports use a separate Rust command. Rust sanitizes the suggested name and shows a native save dialog without returning the destination path.

Desktop session, profile, and audio-output preferences use Rust settings commands. The browser keeps its existing local storage.

## Start the desktop app

The Tauri main window opens `/desktop`. This startup page reads the OS account through Rust.

The OS account ID becomes the local account ID. The OS display name initializes the profile name.

A new account enters onboarding automatically. A completed account opens the last safe app route from the Rust settings table.

The route tracker does not store secondary windows, marketing pages, or OAuth credentials. If no safe route exists, the app opens Spaces.

## Keep the web build unchanged

The browser adapter keeps IndexedDB for records and file blobs. The normal web build also keeps its browser-local AI providers.

The Tauri build replaces WebLLM, Whisper, Transformers, and Kokoro modules with desktop stubs. Remote providers remain available.

## Run the desktop app

Install Rust and the Tauri system dependencies. Then run this command from the repository root:

```sh
make desktop-dev
```

Create an installable bundle with this command:

```sh
make desktop-build
```
