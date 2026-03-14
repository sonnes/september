# September for macOS

Native assistive communication app for people with ALS, MND, or speech/motor difficulties. Integrates at the OS level with floating panels, system-wide keyboard input, and native speech services.

## Requirements

- macOS 14+ (Sonoma)
- Xcode 15.2+ / Swift 5.10+

## Build & Run

SwiftData macros require the Xcode toolchain. Set `DEVELOPER_DIR` if your default is Command Line Tools:

```bash
cd apps/swift
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer

swift build          # Compile
swift run September  # Launch app
swift test           # Run tests
```

## Architecture

```
Sources/September/
├── App/                     # Entry point, window management
├── Core/
│   ├── Models/              # SwiftData models (Account, Document, Panel)
│   └── DesignTokens/        # Colors, typography
├── Features/
│   ├── Keyboard/            # Type mode
│   ├── Talk/                # Talk mode
│   ├── Writer/              # Write mode
│   └── Settings/            # Settings screens
└── Services/
    ├── AI/                  # AI provider abstraction
    ├── Speech/              # TTS abstraction (AVSpeech, etc.)
    └── Transcription/       # STT abstraction
```

### Guidelines

- `@Observable` with `@MainActor` for view models (not `ObservableObject`)
- `@State` for view model ownership, `@Bindable` for two-way binding
- Strict Swift concurrency: all types crossing threads must be `Sendable`
- SwiftData for local persistence
- `NSPanel` + `NSHostingView` for floating windows (non-activating)

### Dev Notes

- **Schema changes during development:** A `#if DEBUG` guard in `SeptemberApp.swift` will delete and recreate the SwiftData store if the schema is incompatible. This prevents crashes when iterating on models. Remove before shipping.
- **Fonts:** Typography constants reference JetBrains Mono and Geist with system fallbacks. Fonts are not bundled yet — they will be added when the keyboard UI is built.
