# CLAUDE.md — Swift macOS App

Project orientation for Claude Code when working on `apps/swift/`.

## What is this?

September's native macOS on-screen keyboard app for users with ALS/MND/motor difficulties. Built with SwiftUI + AppKit as a Swift Package (no Xcode project). Zero external dependencies.

## Architecture

- **Floating Panel**: NSPanel with `.nonactivatingPanel` style — keyboard stays on top without stealing focus
- **State**: `@Observable` + `@MainActor` on all state classes (not ObservableObject)
- **App Lifecycle**: NSApplicationDelegate (ScenePhase is unreliable on macOS)
- **Event Injection**: CGEvent for synthetic keyboard input
- **Text Reading**: AXUIElement + AXObserver to read focused text fields across apps
- **Suggestions**: NSSpellChecker (word completions) + Foundation Models (sentence predictions, macOS 26+)

## Key Patterns

**State management:**
```swift
@MainActor
@Observable
final class MyManager {
    private(set) var state = ""
}
```

**View ownership:**
```swift
struct MyView: View {
    @State private var manager = MyManager()  // View owns it
    // OR
    @Bindable var manager: MyManager          // Two-way binding
    // OR
    @Environment(MyManager.self) var manager  // Injected
}
```

**Dwell control on buttons:**
```swift
KeyButton(key: key) { /* action */ }
// Uses .dwell() modifier internally — hover triggers after configurable delay
```

**Debouncing:**
- Word suggestions: 50ms via DispatchWorkItem
- Sentence predictions: 900ms via DispatchWorkItem

## Module Layout

```
Sources/September/
├── SeptemberApp.swift       # Entry point, AppDelegate, panel setup
├── Accessibility/           # Permission, CGEvent injection, AXUIElement reading
├── Keyboard/                # QWERTY layout, key definitions, key buttons
├── Shortcuts/               # System shortcut panels (⌘C, ⌘V, etc.)
├── Suggestions/             # TypingTracker, word & sentence engines, UI
└── UI/                      # FloatingPanel (NSPanel), DwellModifier
```

## Development

```bash
swift build           # Build
swift run September   # Run
./build.sh            # Build .app bundle
```

## Rules

- **Accessibility is non-negotiable**: Every interactive element needs `.accessibilityLabel()`. Minimum 60x60pt buttons. WCAG AA contrast. No time-limited interactions.
- **@MainActor everywhere**: All @Observable classes and UI state must be @MainActor isolated.
- **async/await only**: No Combine. Use Task and async/await for all async work.
- **No external dependencies**: Only macOS system frameworks.
- **Read docs first**: Before architectural changes, read the relevant guide in `docs/`.
- **Update README.md**: After making changes, update the README if the architecture or features changed.
- **File naming**: Swift files use PascalCase. Docs use lowercase-kebab-case.

## Reference Docs

Read these before making architectural decisions:

- [docs/macos-swiftui-best-practices.md](docs/macos-swiftui-best-practices.md) — Architecture, state, performance
- [docs/accessibility-implementation-guide.md](docs/accessibility-implementation-guide.md) — VoiceOver, keyboard nav, Switch Control
- [docs/swift-concurrency-patterns.md](docs/swift-concurrency-patterns.md) — async/await, MainActor, actors
- [docs/foundation-models-research.md](docs/foundation-models-research.md) — On-device AI with Foundation Models
