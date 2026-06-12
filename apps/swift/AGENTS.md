# September macOS — Claude

Assistive communication app (ALS/MND). Native macOS with SwiftUI + AppKit. Local-first with SwiftData. Target macOS 14+ (Sonoma).

## Build

Requires Xcode toolchain for SwiftData macros — always set `DEVELOPER_DIR`.

| Command          | Purpose                    |
| ---------------- | -------------------------- |
| `./build.sh`     | Build signed `.app` bundle |
| `./build.sh dev` | Quick dev run              |
| `swift build`    | Compile only               |
| `swift test`     | Run tests                  |

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
```

## Swift Style

- `@Observable` + `@MainActor` for view models — never `ObservableObject` / `@Published` / `Combine`
- `@State` for ownership, `@Bindable` for two-way binding
- `@MainActor @Observable` for UI-coupled services (e.g., `AVSpeechService`)
- `actor` for background services (e.g., AI, Transcription)
- All types crossing actor boundaries must be `Sendable`
- `async/await` everywhere, no completion handlers
- Service protocols in `Services/<Domain>/<Domain>Service.swift`, mocks in `Mock<Domain>Service.swift`
- `Codable` struct fields must have defaults for forward-compatible decoding
- Prefer editing existing files over creating new ones

## Testing

Swift Testing framework (`@Test`, `#expect`, `@Suite`). In-memory `ModelContainer` for SwiftData tests. `@MainActor` on tests touching main-actor-isolated types.

## Design Reference

Specs and mockups in `docs/swift/assets/`. Product overview: `docs/swift/product-overview.md`. Roadmap: `docs/swift/roadmap.md`.

**READ and UPDATE the README.md before and after making changes.**
