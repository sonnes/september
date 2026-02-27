# macOS SwiftUI Best Practices Guide
## Building High-Quality Accessibility Apps (2024-2026)

**Last Updated:** February 27, 2026  
**Target:** September macOS Accessibility Keyboard App  
**Swift Versions:** 5.10+ (Swift 6.0 migration ready)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Modern SwiftUI Architecture (2025)](#modern-swiftui-architecture-2025)
3. [State Management Best Practices](#state-management-best-practices)
4. [macOS Navigation Patterns](#macos-navigation-patterns)
5. [App Lifecycle & Window Management](#app-lifecycle--window-management)
6. [Accessibility Implementation](#accessibility-implementation)
7. [Performance Optimization](#performance-optimization)
8. [Modern Swift Concurrency](#modern-swift-concurrency)
9. [macOS UI Guidelines](#macos-ui-guidelines)
10. [Distribution & Security](#distribution--security)
11. [Award-Winning App Patterns](#award-winning-app-patterns)
12. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

This guide synthesizes best practices from award-winning macOS apps (Things 3, Fantastical, Raycast, CleanShot X, Bear, Craft, Pixelmator Pro) and modern SwiftUI development (2024-2026). **Key theme:** Modern MVVM with `@Observable` has replaced classic `@ObservableObject` patterns, and Swift 6.0 strict concurrency is now the standard.

### Core Principles for September Keyboard App

1. **@Observable + @Bindable** for clean, performant state management
2. **Unidirectional data flow** where appropriate (user action → state update → view render)
3. **Accessibility-first** design: VoiceOver support, keyboard navigation, Switch Control
4. **Floating panel** with `.nonactivatingPanel` to avoid stealing focus from user's active app
5. **Swift 6.0 strict concurrency** with `@MainActor`, `Sendable` types, and `async/await`
6. **Minimal view body complexity** with aggressive subview extraction
7. **Platform conventions** over custom patterns (match macOS, not iOS)

---

## Modern SwiftUI Architecture (2025)

### The Observable Macro Revolution

In SwiftUI 2025, the `@Observable` macro (iOS 17+, macOS 14+) replaces ObservableObject entirely:

```swift
// OLD PATTERN (Don't use for new code)
class OldViewModel: ObservableObject {
    @Published var value: String = ""
}

// NEW PATTERN (Use this)
@Observable
final class KeyboardViewModel {
    var suggestions: [String] = []
    var selectedKey: String?
    var isTrackingMouse: Bool = false
    
    nonisolated init() {
        // nonisolated lets you use async context during init
    }
}
```

### @Observable vs ObservableObject

| Aspect | @Observable | ObservableObject |
|--------|-------------|------------------|
| Boilerplate | None (macro handles it) | Explicit @Published on each property |
| Performance | Fine-grained tracking (only changed properties trigger redraws) | All property changes trigger full redraw |
| Thread Safety | Automatically MainActor isolated | Manual MainActor management |
| Testing | Easier (plain Swift class) | Requires framework knowledge |
| Binding | Use @Bindable directly | Requires @StateObject wrapper |
| Swift Version | iOS 17+, macOS 14+ | All versions |

### Proper @Observable Usage in Views

```swift
// In your view:
@State private var viewModel = KeyboardViewModel()

// Pass to subviews:
var body: some View {
    KeyboardContent(viewModel: viewModel)
}

// In subviews:
struct KeyboardContent {
    let viewModel: KeyboardViewModel  // let, not @ObservedObject
    
    var body: some View {
        VStack {
            // When you need to bind to a property:
            @Bindable var model = viewModel
            TextField("", text: $model.selectedKey)
        }
    }
}

// Or use environment:
struct MyView {
    @Environment(KeyboardViewModel.self) var viewModel
    
    var body: some View {
        Text(viewModel.suggestions.first ?? "")
    }
}
```

### Environment Integration

```swift
@main
struct SeptemberApp: App {
    @State private var appState = AppState()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
        }
    }
}

@Observable
final class AppState {
    var isDarkMode: Bool = false
    var fontSize: CGFloat = 14
}

// In views:
struct KeyboardView {
    @Environment(AppState.self) var appState
    
    var body: some View {
        Text("Size: \(appState.fontSize)")
    }
}
```

---

## State Management Best Practices

### When to Use Each Property Wrapper

| Wrapper | Use Case | Scope | Isolation |
|---------|----------|-------|-----------|
| `@State` | Local view state | Single view + children | View owned |
| `@Binding` | Shared local state | Parent-child | Parent provides |
| `@Environment` | App-wide data | All views via environment | MainActor |
| `@Bindable` | Two-way binding to @Observable | View + children | As-is |
| `@FocusState` | Keyboard focus tracking | Single view | View owned |
| `@SceneStorage` | Per-window persistence | One window | MainActor |
| `@AppStorage` | Simple user preferences | App-wide, persisted | UserDefaults |

### Practical Example: Keyboard State Management

```swift
@Observable
final class KeyboardManager {
    var keys: [KeyDefinition] = []
    var suggestions: [String] = []
    var dwellTime: TimeInterval = 1.0
    var selectedKeyIndex: Int?
    
    @MainActor
    func insertSuggestion(_ text: String) {
        // MainActor ensures UI thread safety
    }
    
    nonisolated func loadKeys() async throws {
        // nonisolated for background work
        let keys = try await fetchKeys()
        await MainActor.run {
            self.keys = keys
        }
    }
}

struct KeyboardView {
    @State private var manager = KeyboardManager()
    @FocusState private var focusedKey: String?
    
    var body: some View {
        VStack {
            ForEach(manager.keys, id: \.id) { key in
                KeyButton(key: key)
                    .focused($focusedKey, equals: key.id)
            }
        }
        .task {
            try? await manager.loadKeys()
        }
    }
}
```

### Avoiding Common State Mistakes

**DON'T:**
```swift
// Don't store ObservableObject in @State
@State private var viewModel: MyViewModel  // Wrong!

// Don't pass @State down multiple levels
func childView(_ state: Binding<String>) {
    AnotherChild(state: state)  // Chain breaks readability
}

// Don't mutate state in view body
var body: some View {
    Text {
        manager.count += 1  // Wrong! Side effect in body
    }
}
```

**DO:**
```swift
// Use @State for @Observable classes
@State private var viewModel = MyViewModel()

// Use @Environment for deeply nested state
@Environment(AppState.self) var appState

// Use .task for side effects
var body: some View {
    Text(manager.count)
        .task { await manager.load() }
}
```

---

## macOS Navigation Patterns

### NavigationSplitView for macOS

The standard macOS navigation pattern uses `NavigationSplitView` with sidebar + content:

```swift
struct KeyboardApp: View {
    @State private var selection: String?
    
    var body: some View {
        NavigationSplitView {
            // Sidebar: navigation destinations
            List(["Keyboard", "Shortcuts", "Settings"], id: \.self, selection: $selection) { item in
                NavigationLink(item, value: item)
            }
            .navigationSplitViewColumnWidth(min: 180, ideal: 250)
        } content: {
            // Content: details for selected sidebar item
            if let selection {
                ContentForSelection(selection)
            } else {
                Text("Select an item")
            }
        }
    }
}

@ViewBuilder
func ContentForSelection(_ item: String) -> some View {
    switch item {
    case "Keyboard":
        KeyboardEditorView()
    case "Shortcuts":
        ShortcutsEditorView()
    case "Settings":
        SettingsView()
    default:
        EmptyView()
    }
}
```

### Menu Bar + Floating Panel Pattern

For September's architecture (which already uses FloatingPanel):

```swift
@main
struct SeptemberApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate
    
    var body: some Scene {
        // Settings is dummy scene — real UI is floating panel
        Settings {
            EmptyView()
        }
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var panel: FloatingPanel?
    private var statusItem: NSStatusItem?
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        setupFloatingPanel()
        setupMenuBar()
    }
    
    private func setupFloatingPanel() {
        let hostingView = NSHostingView(rootView: KeyboardView())
        panel = FloatingPanel(contentView: hostingView)
        panel?.orderFront(nil)
    }
    
    private func setupMenuBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        
        if let button = statusItem?.button {
            button.image = NSImage(systemSymbolName: "keyboard", accessibilityDescription: "September")
        }
        
        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "Show", action: #selector(showPanel), keyEquivalent: "k"))
        menu.addItem(NSMenuItem(title: "Hide", action: #selector(hidePanel), keyEquivalent: ""))
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Quit", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        
        statusItem?.menu = menu
    }
    
    @objc private func showPanel() { panel?.orderFront(nil) }
    @objc private func hidePanel() { panel?.orderOut(nil) }
}
```

### Window Management Best Practices

```swift
struct MyWindow: Scene {
    @State private var selection: String?
    
    var body: some Scene {
        Window("Keyboard Settings", id: "settings") {
            NavigationSplitView(selection: $selection) {
                List(["General", "Advanced"], id: \.self, selection: $selection) { item in
                    NavigationLink(item, value: item)
                }
            } content: {
                Group {
                    if selection == "General" {
                        GeneralSettings()
                    } else if selection == "Advanced" {
                        AdvancedSettings()
                    }
                }
            }
        }
        .windowResizability(.contentSize)
        .defaultSize(width: 600, height: 400)
        .keyboardShortcut("s", modifiers: [.command, .shift])
    }
}
```

---

## App Lifecycle & Window Management

### macOS App Lifecycle (2024 Reality)

**Important:** ScenePhase doesn't work reliably on macOS. You must use AppDelegate for lifecycle events:

```swift
@main
struct SeptemberApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate
    
    var body: some Scene {
        Settings { EmptyView() }
    }
}

@Observable
final class AppState {
    var isAccessibilityGranted: Bool = false
    var isDarkMode: Bool = false
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var appState = AppState()
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        // App launched
        setupAccessibility()
        loadPreferences()
    }
    
    func applicationWillTerminate(_ notification: Notification) {
        // App shutting down - save state
        savePreferences()
        cleanup()
    }
    
    func applicationDidBecomeActive(_ notification: Notification) {
        // App came to foreground
    }
    
    func applicationDidResignActive(_ notification: Notification) {
        // App going to background
    }
    
    private func setupAccessibility() {
        // Request accessibility permissions
    }
    
    private func loadPreferences() {
        // Load from UserDefaults
    }
    
    private func savePreferences() {
        // Save to UserDefaults
    }
    
    private func cleanup() {
        // Release resources
    }
}
```

### Window Lifecycle in SwiftUI

```swift
struct ContentView {
    @SceneStorage("windows.mainWindow.isVisible") private var isVisible = true
    @Environment(\.scenePhase) private var scenePhase
    
    var body: some View {
        VStack {
            // Content
        }
        .onAppear {
            // Window appeared
        }
        .onDisappear {
            // Window closed
        }
        .onChange(of: scenePhase) { _, newPhase in
            switch newPhase {
            case .background:
                break  // App backgrounded
            case .inactive:
                break  // App inactive
            case .active:
                break  // App active
            @unknown default:
                break
            }
        }
    }
}
```

---

## Accessibility Implementation

### Three Pillars of macOS Accessibility

**1. VoiceOver Support (Screen Reader)**

For every custom view, provide accessibility labels:

```swift
// For custom keyboard buttons
struct KeyButton: View {
    let key: KeyDefinition
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack {
                Text(key.display)
                    .font(.system(size: 16))
            }
            .frame(minWidth: 40, minHeight: 40)
        }
        .accessibilityLabel("Key: \(key.display)")
        .accessibilityHint("Double tap to press this key")
        .accessibilityAddTraits(.isButton)
    }
}

// For containers that group related items
struct KeyboardView: View {
    var body: some View {
        VStack {
            // ... keys ...
        }
        .accessibilityElement(children: .contain)  // Combine children for VoiceOver
        .accessibilityLabel("Keyboard")
    }
}
```

**2. Keyboard Navigation & Focus Management**

```swift
struct AccessibleKeyboardView: View {
    @FocusState private var focusedKey: String?
    @State private var keys = KeyBoard.allKeys
    
    var body: some View {
        VStack {
            ForEach(keys, id: \.id) { key in
                Button(action: { insertKey(key) }) {
                    Text(key.display)
                }
                .focused($focusedKey, equals: key.id)
                .keyboardShortcut(key.shortcut, modifiers: [])
            }
        }
        .onKeyPress { press in
            handleKeyPress(press)
        }
    }
    
    private func handleKeyPress(_ press: KeyPress) -> KeyPress.Result {
        // Implement keyboard navigation
        switch press.key {
        case .leftArrow:
            focusedKey = previousKey()
            return .handled
        case .rightArrow:
            focusedKey = nextKey()
            return .handled
        case .space:
            insertKey(currentKey())
            return .handled
        default:
            return .ignored
        }
    }
}
```

**3. Switch Control & Custom Actions**

```swift
// Make view work with Switch Control
struct SwitchControlAccessibleView: View {
    let key: KeyDefinition
    
    var body: some View {
        Button(action: { pressKey() }) {
            Text(key.display)
        }
        .accessibilityAddTraits(.isButton)
        .accessibilityRemoveTraits(.isEnabled)  // Switch Control will navigate
        .accessibilityAction(.activate) {
            pressKey()  // Called by Switch Control
        }
    }
    
    private func pressKey() {
        // Inject event
    }
}
```

### VoiceOver Testing

Always test with VoiceOver enabled:

```bash
# Enable VoiceOver: Cmd+F5
# Navigate: VO (Control+Option) + arrow keys
# Activate: VO+Space
```

Test checklist:
- [ ] All text elements have labels
- [ ] Images have descriptions
- [ ] Buttons describe their action
- [ ] Form fields have labels
- [ ] Custom controls work with VO
- [ ] Focus order is logical
- [ ] Status messages are announced

---

## Performance Optimization

### View Body Complexity

The most common performance issue is expensive computation in view bodies:

```swift
// SLOW: Formatter created every render
var body: some View {
    let formatter = DateFormatter()  // Created repeatedly!
    formatter.dateStyle = .medium
    return Text(formatter.string(from: date))
}

// FAST: Formatter created once
struct DateView: View {
    let date: Date
    private let formatter = DateFormatter()
    
    var body: some View {
        Text(formatter.string(from: date))
    }
}
```

### Extract Subviews Aggressively

```swift
// SLOW: Complex body
var body: some View {
    VStack {
        VStack { /* ... */ }
        VStack { /* ... */ }
        VStack { /* ... */ }
    }
}

// FAST: Extracted subviews
var body: some View {
    VStack {
        Header()
        Content()
        Footer()
    }
}

@ViewBuilder
private var Header: some View {
    // Separate view recompilation
}
```

### View Body Complexity Metrics

Use Instruments to profile:

```bash
# Profile in Xcode: Product → Profile
# Template: SwiftUI
# Look for orange/red in timeline (slow renders)
```

Key tools:
- **SwiftUI Instrument:** Shows view body call counts
- **Time Profiler:** Shows CPU time per method
- **Allocations:** Tracks memory peaks
- **Memory Graph:** Finds reference cycles

### Performance Best Practices

```swift
struct KeyboardView: View {
    @State private var manager = KeyboardManager()
    
    var body: some View {
        // ✓ Extract expensive sections
        keyboardSection
        suggestionsSection
    }
    
    // ✓ Separate computed properties for sections
    @ViewBuilder
    private var keyboardSection: some View {
        VStack {
            ForEach(manager.keys, id: \.id) { key in
                KeyButtonRow(key: key)
                    .id(key.id)  // Stable identity for reuse
            }
        }
    }
    
    @ViewBuilder
    private var suggestionsSection: some View {
        if !manager.suggestions.isEmpty {
            SuggestionsBar(suggestions: manager.suggestions)
                .frame(height: 44)  // Fixed height helps layout
        }
    }
}

struct KeyButtonRow: View {
    let key: KeyDefinition
    
    // ✓ Use @Equatable to only redraw when key changes
    var body: some View {
        Button(action: {}) {
            Text(key.display)
        }
    }
}
```

---

## Modern Swift Concurrency

### Swift 6.0 Strict Concurrency (2024+)

Swift 6.0 makes concurrency checking mandatory. Enable it gradually:

```swift
// In Build Settings:
// Swift Compiler - Concurrency Checking: Complete

// Check for issues:
// Xcode → Build → Show Issues (Cmd+Shift+M)
```

### @MainActor Usage

All SwiftUI Views are automatically `@MainActor`:

```swift
// This is automatic - don't repeat it
@MainActor
struct KeyboardView: View {
    var body: some View { }
}

// Use for other classes/functions that touch UI
@MainActor
final class KeyboardManager {
    var keys: [KeyDefinition] = []
    
    func updateUI() {
        // This is on main thread
    }
}

// Background work is nonisolated
extension KeyboardManager {
    nonisolated func loadKeysInBackground() async throws {
        let data = try await fetchKeysFromDisk()
        await MainActor.run {
            self.keys = data
        }
    }
}
```

### async/await Patterns

```swift
@Observable
final class KeyboardService {
    nonisolated func fetchSuggestions(for text: String) async throws -> [String] {
        // Run on background thread
        try await Task.sleep(nanoseconds: 100_000_000)  // Simulate work
        return ["suggestion1", "suggestion2"]
    }
    
    @MainActor
    func updateSuggestions(for text: String) async {
        do {
            let suggestions = try await fetchSuggestions(for: text)
            self.suggestions = suggestions  // Update on main thread
        } catch {
            print("Error: \(error)")
        }
    }
}

// In view:
struct SuggestionsView {
    @State private var service = KeyboardService()
    
    var body: some View {
        Text("Suggestions")
            .task(id: inputText) {
                await service.updateSuggestions(for: inputText)
            }
    }
}
```

### Sendable Types

Make types Sendable for thread-safe data passing:

```swift
// Value types are automatically Sendable
struct KeyDefinition: Sendable {
    let id: String
    let display: String
}

// For reference types:
@Observable
final class KeyboardManager: Sendable {
    // Must have only immutable properties accessed via main actor
    private let lock = NSLock()
    
    nonisolated var keyCount: Int {
        // Property must be nonisolated or @MainActor
        0
    }
}

// Or use actors for thread-safe mutable state:
actor DataCache {
    private var data: [String: String] = [:]
    
    func set(_ value: String, for key: String) {
        data[key] = value
    }
    
    func get(_ key: String) -> String? {
        data[key]
    }
}
```

### Common Swift 6 Fixes

```swift
// ISSUE: Global variable not Sendable
var globalSuggestions: [String] = []  // Error in Swift 6

// FIX 1: Make it immutable
let defaultSuggestions: [String] = []

// FIX 2: Add MainActor
@MainActor
var globalSuggestions: [String] = []

// FIX 3: Use actor
actor SuggestionCache {
    private var suggestions: [String] = []
}
```

---

## macOS UI Guidelines

### Human Interface Guidelines Key Principles

**Leverage platform capabilities:** macOS users expect spacious, powerful interfaces that make full use of large screens.

**Follow conventions:** Use standard macOS controls and layouts. Match platform, not iOS.

**Prioritize content:** Tools and controls should not overwhelm the content you're working with.

### Specific macOS Patterns

**Sidebars (for navigation):**
```swift
NavigationSplitView {
    List(items, id: \.id, selection: $selection) { item in
        NavigationLink(item.name, value: item)
            .badge(item.unreadCount)  // Optional badge
    }
    .navigationSplitViewColumnWidth(min: 180, ideal: 250)
} content: {
    // Detail view
}
```

**Toolbars:**
```swift
var body: some View {
    VStack {
        // Content
    }
    .toolbar {
        ToolbarItemGroup(placement: .primaryAction) {
            Button(action: save) {
                Label("Save", systemImage: "checkmark")
            }
        }
        
        ToolbarItem(placement: .secondaryAction) {
            Menu {
                Button("Export", action: export)
                Button("Settings", action: settings)
            } label: {
                Image(systemName: "ellipsis.circle")
            }
        }
    }
}
```

**Dark Mode:**
```swift
struct MyView: View {
    @Environment(\.colorScheme) var colorScheme
    
    var body: some View {
        VStack {
            Text("Hello")
                .foregroundColor(colorScheme == .dark ? .white : .black)
        }
        .preferredColorScheme(nil)  // Follow system
    }
}

// Or use semantic colors:
Text("Content")
    .foregroundColor(.primary)     // Automatic dark mode
    .background(Color(.controlBackgroundColor))
```

**Typography & Spacing:**
- Use San Francisco font (default)
- Use semantic sizes: `.title`, `.body`, `.caption`
- Spacing: Use standard 8pt grid

```swift
VStack(spacing: 16) {  // 2x standard grid
    Text("Title")
        .font(.title)
    
    Text("Subtitle")
        .font(.subheadline)
        .foregroundColor(.secondary)
}
.padding()
```

---

## Distribution & Security

### Code Signing & Notarization

For distribution:

1. **Get Developer ID certificate** from Apple
2. **Code sign** your app:
   ```bash
   codesign --deep --force --verify --verbose \
     --sign "Developer ID Application: Your Name" \
     /path/to/September.app
   ```
3. **Request Accessibility permission** in entitlements:
   ```xml
   <key>com.apple.security.temporary-exception.apple-events</key>
   <array>
       <string>com.apple.systemevents</string>
   </array>
   ```
4. **Notarize** with Apple:
   ```bash
   xcrun notarytool submit September.zip \
     --apple-id "your@email.com" \
     --password "app-password" \
     --wait
   ```

### Accessibility Permissions

For event injection, request permission:

```swift
// Show permission dialog
func requestAccessibilityPermission() {
    let options = NSDictionary(object: kCFBooleanTrue, forKey: kAXTrustedCheckOptionPrompt.takeRetainedValue())
    AXIsProcessTrustedWithOptions(options as CFDictionary)
}

// Check status
func isAccessibilityGranted() -> Bool {
    AXIsProcessTrusted()
}
```

### Sandboxing Considerations

**Don't sandbox if you need:**
- Accessibility API (AXUIElement)
- Global keyboard events (CGEventTap)
- Access to other app's data

**Benefits of sandboxing:**
- App Store distribution
- Better security perception
- User trust

**Workarounds for sandboxed app:**
- Use XPC services for privileged operations
- Use Input Monitoring (weaker, but sandbox-compatible)

---

## Award-Winning App Patterns

### Things 3

**Key Patterns:**
- **Elegant animations:** Subtle transitions guide user attention
- **Tasteful color usage:** Bright accent colors, lots of white space
- **Fast search:** Powerful find that feels instant
- **Smart natural language:** "Tomorrow at 3pm" parsing
- **Multi-platform consistency:** macOS, iOS, iPad, Watch
- **Fractus sync engine:** Smart conflict resolution for offline edits

**Implementation lesson:** Invest in animation polish and perception of speed.

### Raycast

**Key Patterns:**
- **Menu bar integration:** Always accessible via keyboard
- **Fuzzy search everywhere:** Fast filtering improves UX
- **Plugin extensibility:** Community contributions
- **Keyboard-first:** Every action available via hotkey
- **Minimalist UI:** Content focused, controls secondary

**Implementation lesson:** Keyboard accessibility is not optional—it's primary.

### CleanShot X

**Key Patterns:**
- **Floating windows:** Non-intrusive UI
- **Keyboard shortcuts:** Primary interaction method
- **Dark mode perfection:** Thoughtful appearance settings
- **Instant sharing:** Export in one click
- **Screenshot annotation:** Built-in, not external

**Implementation lesson:** Floating panels should never steal focus.

### Fantastical

**Key Patterns:**
- **Natural language input:** Parses natural language dates
- **Sync across devices:** Seamless calendar integration
- **Powerful search:** Quick access to events
- **Minimalist design:** Only show what's needed
- **Keyboard navigation:** Full keyboard support

**Implementation lesson:** Support natural interaction patterns.

---

## Implementation Checklist

### Architecture Setup

- [ ] Use `@Observable` (not ObservableObject) for ViewModels
- [ ] Use `@Bindable` for child view bindings
- [ ] Use `@Environment` for app-wide state
- [ ] Implement AppDelegate for lifecycle events
- [ ] Set up FloatingPanel for UI (nonactivatingPanel)
- [ ] Configure menu bar status item

### State Management

- [ ] All mutable shared state in @Observable classes
- [ ] All @Observable classes marked @MainActor
- [ ] Background work marked nonisolated
- [ ] No @Published or ObservableObject
- [ ] @State only for local view state
- [ ] @AppStorage for user preferences

### Accessibility

- [ ] All buttons have accessibilityLabel
- [ ] All images have accessibilityLabel
- [ ] VoiceOver tested with Voice Control enabled
- [ ] Keyboard navigation works without mouse
- [ ] Focus order is logical (Tab key)
- [ ] Custom controls implement accessibilityRole
- [ ] Switch Control actions implemented
- [ ] Contrast meets WCAG AA standards

### Performance

- [ ] View bodies extracted into subviews
- [ ] Expensive computations outside body
- [ ] Images use .resizable().scaledToFit()
- [ ] Lists use id for identity
- [ ] Profiled with Instruments
- [ ] No memory leaks (Memory Graph)
- [ ] Frame rates 60fps (Time Profiler)

### UI/UX

- [ ] Follows macOS HIG conventions
- [ ] Dark mode fully supported
- [ ] Respects system font size (Dynamic Type)
- [ ] Spacing follows 8pt grid
- [ ] Animations are < 300ms
- [ ] Hover states on interactive elements
- [ ] Status item has 16pt icon

### Security & Distribution

- [ ] Code signed with Developer ID
- [ ] Notarized for distribution
- [ ] Accessibility permission requested properly
- [ ] Sensitive data in Keychain (not UserDefaults)
- [ ] App includes Privacy Policy
- [ ] Handles permissions gracefully

### Testing

- [ ] Unit tests for ViewModels
- [ ] UI tests for critical flows
- [ ] Accessibility testing with VoiceOver
- [ ] Performance testing with Instruments
- [ ] Memory profiling under load
- [ ] Keyboard navigation testing

---

## References & Sources

### Official Apple Documentation

- [Human Interface Guidelines - macOS](https://developer.apple.com/design/human-interface-guidelines/)
- [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Accessibility in SwiftUI](https://developer.apple.com/videos/play/wwdc2024/10073/)
- [App Architecture Guidelines](https://developer.apple.com/app-frameworks/)

### Advanced Topics

- [Swift Concurrency - DenDev Guide](https://dendv.com/swift-concurrency-guide/2024/12/22/swift-concurrency-guide.html)
- [Observable Macro Migration](https://developer.apple.com/documentation/swiftui/migrating-from-the-observable-object-protocol-to-the-observable-macro)
- [SwiftUI Performance Optimization](https://developer.apple.com/videos/play/wwdc2025/306/)
- [macOS App Lifecycle](https://eclecticlight.co/2024/04/17/swiftui-on-macos-life-cycle-and-app-delegate/)

### Third-Party Resources

- [SwiftUI by Sundell - Tips & Tricks](https://www.swiftbysundell.com/tips/using-an-app-delegate-with-swiftui-app-lifecycle/)
- [Modern MVVM in SwiftUI 2025](https://medium.com/@minalkewat/modern-mvvm-in-swiftui-2025-the-clean-architecture-youve-been-waiting-for-72a7d576648e)
- [Hacking with Swift - Environment & Binding](https://www.hackingwithswift.com/books/ios-swiftui/sharing-observable-objects-through-swiftuis-environment)
- [Keyboard Shortcuts Library](https://github.com/sindresorhus/KeyboardShortcuts)

---

## Next Steps for September

### Phase 1: Architecture Refactor (Week 1-2)

1. Convert all ViewModels to @Observable
2. Replace ObservableObject with plain Observable classes
3. Set up proper @Environment usage
4. Implement AppDelegate pattern correctly

### Phase 2: Accessibility Enhancement (Week 2-3)

1. Add VoiceOver labels to all custom views
2. Test with VoiceOver enabled
3. Implement keyboard navigation
4. Add Switch Control support

### Phase 3: Performance Optimization (Week 3-4)

1. Profile with Instruments
2. Extract view body complexity
3. Fix memory leaks
4. Optimize rendering

### Phase 4: Polish & Distribution (Week 4-5)

1. Code signing setup
2. Notarization workflow
3. Accessibility permissions
4. Final accessibility audit

---

**Last Updated:** February 27, 2026  
**Next Review:** June 2026 (quarterly)  
**Maintained By:** September Team
