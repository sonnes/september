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
│   │   ├── ViewModels/      # PredictionEngine
│   │   └── Views/           # KeyboardAssemblyView, MainKeyboardView, InputBar,
│   │                        # PredictionsPanel, WordSuggestionsBar
│   ├── Talk/                # Talk mode (placeholder)
│   ├── Writer/              # Write mode (placeholder)
│   └── Settings/
│       ├── Models/          # AppTheme
│       └── Views/           # SettingsView, AIProviderSettingsView,
│                            # TTSSettingsView, AppearanceSettingsView
└── Services/
    ├── AI/                  # AIService protocol, OpenAI/Anthropic/Ollama actors,
    │                        # HTTPClient, AIProviderRegistry, AIServiceFactory
    ├── KeyInput/            # EventInjector (CGEvent), AccessibilityManager,
    │                        # ModifierState, AXTextService
    ├── Speech/              # SpeechService, AVSpeechService, SpeechCoordinator,
    │                        # TTSAPIService, OpenAITTSService, ElevenLabsTTSService,
    │                        # AudioPlaybackService
    └── Transcription/       # STT abstraction
```

### AI Predictions (Phase 2)

The keyboard provides AI-powered sentence predictions and word suggestions:

- **Sentence predictions**: 3 AI-generated completions shown as pill cards above the input bar. Powered by OpenAI, Anthropic, or Ollama (configurable in Settings).
- **Word suggestions**: 5 spell-check completions from `NSSpellChecker`, shown as chips. Instant, local, no AI needed.
- **PredictionEngine**: `@MainActor @Observable` class that debounces input (300ms), cancels in-flight requests, and maintains optimistic UI (stale predictions stay visible while loading).
- **AXTextService**: Reads/writes text in the focused app via macOS Accessibility API. Falls back to `EventInjector.typeString()` for apps that don't support AX text mutation.
- **Settings**: Tap the gearshape in InputBar to open AI provider settings (provider, model, API key, temperature).

### Text-to-Speech (Phase 3)

Three TTS engines with a unified speak button in the input bar:

- **AVSpeech**: Built-in, offline. Voice selection + speed control (0.5x–2.0x).
- **OpenAI TTS**: Cloud-based HD voices (alloy, echo, fable, onyx, nova, shimmer). Requires API key.
- **ElevenLabs**: Natural/cloned voices via API. Requires API key.
- **SpeechCoordinator**: `@MainActor @Observable` that routes between AVSpeech (direct) and API providers (synthesize → `AudioPlaybackService`).
- **Speak button**: In InputBar, toggles speak/stop with pulsing animation. Speaks current display text using configured engine.
- **Settings**: Engine cards, voice dropdown, speed slider, preview button.

### Appearance (Phase 3)

- **Theme**: Light / Dark / System — applied via `NSApp.appearance`. `DesignColors` dynamic providers auto-resolve.
- **Keyboard styles**: 4 variants (Light/Dark × Rainbow/Mono). Derived from theme + style preference via `KeyboardStyle.from(theme:rainbow:)`.

### Guidelines

- `@Observable` with `@MainActor` for view models (not `ObservableObject`)
- `@State` for view model ownership, `@Bindable` for two-way binding
- Strict Swift concurrency: all types crossing threads must be `Sendable`
- SwiftData for local persistence
- `NSPanel` + `NSHostingView` for floating windows (non-activating)

### Dev Notes

- **Accessibility permission:** The app requires Accessibility permission to inject keystrokes via CGEvent and read/write text via AXUIElement. Grant it in System Settings → Privacy & Security → Accessibility. A banner appears in the keyboard if permission is not granted.
- **Keyboard styles:** 4 variants via `@AppStorage("keyboardStyle")` — Dark Rainbow, Dark Mono, Light Rainbow, Light Mono. Rainbow applies per-row accent colors; Mono uses uniform neutral. Theme + style combined via `KeyboardStyle.from(theme:rainbow:)`.
- **Fonts:** Typography constants reference JetBrains Mono and Geist with system fallbacks. Fonts are not bundled yet.
- **API keys:** Stored in SwiftData (app sandbox protected). Keychain migration planned for Phase 7. Never log full API keys.
- **AI providers:** Configured via `AIProviderRegistry`. Add new providers by: (1) adding to `AIProvider` enum, (2) creating an actor conforming to `AIService`, (3) adding registry entry, (4) adding factory case.
