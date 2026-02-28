# September

September is a native on-screen keyboard for Mac & iPad. It is designed for users with motor difficulties, to help them type, talk, and write with just one app.

## Features

- **On-Screen QWERTY Keyboard** — Full 5-row layout with shift/caps lock, large buttons (44pt+), always-on-top floating panel that never steals focus
- **Dwell Control** — Hover over a button to activate it after a configurable delay (default 0.6s) with visual progress feedback
- **Word Suggestions** — Real-time word completions via NSSpellChecker, shown in a top bar while typing
- **Sentence Predictions** — On-device AI sentence continuations via Apple Foundation Models (macOS 26+), displayed in a floating panel below the keyboard
- **System Shortcuts** — Pre-configured panels for common shortcuts (Cut, Copy, Paste, Undo, Redo, terminal controls, text movement)
- **Context-Aware** — Reads the focused text field in any app via Accessibility APIs to provide relevant suggestions
- **Status Bar Menu** — Show/hide keyboard, check accessibility permission status

## Architecture

```
Sources/September/
├── SeptemberApp.swift          # App entry point & AppDelegate
├── Accessibility/              # Permission, event injection, text reading
│   ├── AccessibilityManager    # Manages accessibility trust state
│   ├── EventInjector           # Sends synthetic keyboard events (CGEvent)
│   └── FocusedTextReader       # Reads focused text field (AXUIElement/AXObserver)
├── Keyboard/                   # Keyboard UI & key layout
│   ├── KeyboardView            # Main QWERTY layout
│   ├── KeyDefinition           # Key metadata & KeyboardLayout (static data)
│   ├── KeyButton               # Individual key UI with dwell support
│   └── KeyCodes                # US QWERTY key code constants
├── Shortcuts/                  # System keyboard shortcuts
│   ├── ShortcutPanelView       # Shortcut panel UI
│   ├── ShortcutDefinition      # Shortcut metadata & ShortcutLayout
│   └── ShortcutButton          # Individual shortcut button
├── Suggestions/                # Word & sentence suggestions
│   ├── TypingTracker           # Coordinates suggestion engines + debouncing
│   ├── SuggestionEngine        # Word completions (NSSpellChecker)
│   ├── SentencePredictionEngine # Sentence continuations (Foundation Models)
│   ├── SuggestionsBarView      # Word suggestions UI
│   └── SentencePredictionsView # Sentence predictions UI
└── UI/                         # Custom UI components
    ├── FloatingPanel            # NSPanel subclass (always-on-top, non-activating)
    └── DwellModifier            # SwiftUI modifier for dwell control
```

## Data Flow

```
User clicks/dwells on KeyButton
  → EventInjector sends CGEvent to system
  → FocusedTextReader observes text field changes
  → TypingTracker dispatches to suggestion engines
    → SuggestionEngine (50ms debounce)  → SuggestionsBarView
    → SentencePredictionEngine (900ms)  → SentencePredictionsView
  → User clicks suggestion → apply (delete partial + type completion)
  → Cycle repeats
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Swift 5.10+ |
| UI | SwiftUI + AppKit (NSPanel, NSApplication) |
| State | @Observable + @MainActor |
| Async | async/await, Task, DispatchQueue |
| Accessibility | AXUIElement, AXObserver, NSAccessibility |
| Event Injection | CGEvent |
| Word Suggestions | NSSpellChecker |
| Sentence AI | Foundation Models (on-device, macOS 26+) |
| Min macOS | 14.0 (Sonoma) |
| Dependencies | None (system frameworks only) |

## Development

```bash
# Build
cd apps/swift
swift build

# Build .app bundle
./build.sh

# Run
swift run September
# or open .build/September.app
```

## Documentation

See [docs/](docs/) for research and reference material:

- [docs/README.md](docs/README.md) — Documentation index
- [docs/research-summary.md](docs/research-summary.md) — Executive summary of research findings
- [docs/macos-swiftui-best-practices.md](docs/macos-swiftui-best-practices.md) — Architecture reference
- [docs/accessibility-implementation-guide.md](docs/accessibility-implementation-guide.md) — Accessibility guide
- [docs/swift-concurrency-patterns.md](docs/swift-concurrency-patterns.md) — Concurrency patterns
- [docs/foundation-models-research.md](docs/foundation-models-research.md) — Foundation Models deep dive
