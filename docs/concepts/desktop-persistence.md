---
title: Desktop persistence
description: The independent Tauri app keeps records in SQLite and file bytes in regular files behind Rust commands.
package: desktop
---

# Desktop persistence

The desktop app has its own React and Vite UI in `apps/desktop`. Screens move
from the web app one at a time instead of sharing routes and components at
runtime. The Rust backend remains the privileged boundary for local data.

## Read and write records

Ported desktop screens will call typed TypeScript clients that invoke Rust
commands. The web app keeps its separate IndexedDB data path.

Rust validates each request and stores records in SQLite. Related writes use a
batch command when they must succeed or fail together. Space deletion and
generated-phrase replacement are transactional on desktop.

Rust change events name the affected collections so the desktop UI can refresh
only the related data.

## Store file bytes

Rust stores file bytes under Tauri's application-local-data directory. SQLite stores the media type, size, timestamps, and generated file ID.

The webview cannot submit a storage path. It writes bytes and receives an opaque ID.

Audio features still use stable logical names. An `audio-file-aliases` record maps each logical name to its Rust file ID.

Generated exports use a separate Rust command. Rust sanitizes the suggested name and shows a native save dialog without returning the destination path.

Desktop route and audio-output preferences can use Rust settings commands. The
browser keeps its existing local storage.

## Start the desktop app

The Tauri main window opens the independent UI at `/`. Its default size is
1376×1032, the 13-inch iPad landscape baseline. The initial surface is empty;
startup and onboarding behavior will return as those screens are ported.

## Keep browser storage separate

The browser app keeps IndexedDB for records and file blobs. It also keeps its
browser-local AI providers. The independent desktop UI does not import those
providers during the bootstrap phase.

## Run the desktop app

Install Rust and the Tauri system dependencies. Then run this command from the repository root:

```sh
make desktop-dev
```

Create an installable bundle with this command:

```sh
make desktop-build
```
