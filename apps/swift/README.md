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
├── App/                     # Entry point (AppDelegate), FloatingPanel, menu bar
├── Core/
│   ├── Models/              # SwiftData models (Account, Document, Panel)
│   ├── DesignTokens/        # Colors, typography
│   └── UI/                  # Shared view modifiers (DwellModifier)
├── Features/
│   ├── Keyboard/
│   │   ├── Models/          # KeyDefinition, KeyboardLayout, KeyCodes, ShortcutDefinition
│   │   ├── Components/      # KeyBase, KeyView, KeyAppearance, ShortcutButton
│   │   └── Views/           # KeyboardAssemblyView, MainKeyboardView, InputBar, etc.
│   ├── Talk/                # Talk mode (placeholder)
│   ├── Writer/              # Write mode (placeholder)
│   └── Settings/            # Settings screens (placeholder)
└── Services/
    ├── AI/                  # AI provider abstraction
    ├── KeyInput/            # EventInjector (CGEvent), AccessibilityManager, ModifierState
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

- **Accessibility permission:** The app requires Accessibility permission to inject keystrokes via CGEvent. Grant it in System Settings → Privacy & Security → Accessibility. A banner appears in the keyboard if permission is not granted.
- **Keyboard styles:** Toggle between Dark Rainbow and Dark Mono via `@AppStorage("keyboardStyle")`. Rainbow applies per-row accent colors; Mono uses uniform neutral.
- **Fonts:** Typography constants reference JetBrains Mono and Geist with system fallbacks. Fonts are not bundled yet.
