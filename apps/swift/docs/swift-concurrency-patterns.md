# Swift Concurrency Patterns for macOS Apps
## Modern async/await, Actors, and Thread Safety (Swift 5.10+, Swift 6.0)

**Last Updated:** February 27, 2026  
**Target:** September macOS Accessibility Keyboard  
**Swift Version:** 5.10+ with Swift 6.0 migration

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [Swift 6.0 Strict Concurrency](#swift-60-strict-concurrency)
3. [async/await Patterns](#asyncawait-patterns)
4. [Actor Isolation](#actor-isolation)
5. [MainActor Deep Dive](#mainactor-deep-dive)
6. [Task Management](#task-management)
7. [Common Pitfalls](#common-pitfalls)
8. [September Keyboard Patterns](#september-keyboard-patterns)

---

## Fundamentals

### The Problem Concurrency Solves

Without concurrency:
```swift
// Blocking! App freezes while loading
let keys = loadKeysFromDisk()  // Might take 1-2 seconds
displayKeys(keys)              // After 1-2 second delay
```

With concurrency:
```swift
// Non-blocking! App stays responsive
Task {
    let keys = await loadKeysFromDisk()  // Background thread
    await displayKeys(keys)               // Main thread
}
// Returns immediately, doesn't block UI
```

### Core Concepts

**Async function:** A function that can pause and resume
```swift
func loadKeys() async -> [KeyDefinition] {
    // Can use await here
}
```

**await:** "Pause here; I'm waiting for something"
```swift
let keys = await loadKeys()  // Pause until keys arrive
```

**Task:** "Run this async code"
```swift
Task {
    let keys = await loadKeys()
}
```

**Actor:** "Only one thing at a time in here"
```swift
actor KeyboardState {
    // Only one task can access this at a time
}
```

---

## Swift 6.0 Strict Concurrency

### What Changed?

Swift 6.0 (June 2024) made concurrency **mandatory**, not optional.

```swift
// Swift 5.10: Warning
var globalKeys: [String] = []  // Warning: not thread-safe

// Swift 6.0: Error
var globalKeys: [String] = []  // Error: must be isolated
```

### Enabling Swift 6.0 Strict Checking

**In Xcode:**
```
Build Settings → Swift Compiler → Concurrency Checking → Complete
```

**Or in Package.swift:**
```swift
let package = Package(
    name: "September",
    platforms: [
        .macOS(.v14)
    ],
    swiftLanguageVersions: [.v6]  // Enable Swift 6
)
```

### The Three Rules of Swift 6.0

**Rule 1: Global variables must be isolated**
```swift
// ❌ WRONG: Not isolated
var suggestions: [String] = []

// ✅ CORRECT: Isolated to main thread
@MainActor
var suggestions: [String] = []

// ✅ CORRECT: Immutable (no race condition)
let defaultSuggestions: [String] = ["Hello", "Hi"]
```

**Rule 2: Sendable types can cross thread boundaries**
```swift
// ✅ CORRECT: Value types are Sendable
struct KeyDefinition: Sendable {
    let id: String
    let display: String
}

// ❌ WRONG: Reference type, not Sendable
class KeyDefinition {
    var id: String
}

// ✅ CORRECT: Final class with only constants
final class KeyDefinition: Sendable {
    let id: String
    let display: String
}
```

**Rule 3: Data must be isolated**
```swift
// ❌ WRONG: Shared mutable data
var keyCache: [String: String] = [:]

// ✅ CORRECT: Isolated with @MainActor
@MainActor
var keyCache: [String: String] = [:]

// ✅ CORRECT: Protected with actor
actor KeyCache {
    private var cache: [String: String] = [:]
    
    func get(_ key: String) -> String? {
        cache[key]
    }
    
    func set(_ value: String, for key: String) {
        cache[key] = value
    }
}
```

---

## async/await Patterns

### Basic Pattern

```swift
// Define an async function
func fetchSuggestions(for text: String) async throws -> [String] {
    // This can pause (await), return a value, or throw
    let suggestions = try await APIClient.getSuggestions(text)
    return suggestions
}

// Call it from an async context
Task {
    do {
        let suggestions = try await fetchSuggestions(for: "hello")
        print(suggestions)
    } catch {
        print("Error: \(error)")
    }
}
```

### Async Properties (Swift 5.5+)

```swift
@Observable
final class KeyboardManager {
    nonisolated var loadedKeys: [KeyDefinition] {
        get async {
            try? await loadKeys()
        }
    }
}

// Use in view:
struct KeyboardView {
    @State private var manager = KeyboardManager()
    
    var body: some View {
        Text("Keys: \(manager.loadedKeys.count)")
            .task {
                let keys = await manager.loadedKeys
            }
    }
}
```

### Try vs Try?

```swift
// Use `try await` when you want to handle errors
Task {
    do {
        let keys = try await loadKeys()
        // Use keys
    } catch {
        print("Failed: \(error)")
    }
}

// Use `try?` when you want to ignore errors
Task {
    let keys = try? await loadKeys()
    // keys is [KeyDefinition]?, nil if failed
}

// Use `try!` only if error is impossible
let keys = try! await loadKeys()  // Crashes if fails
```

---

## Actor Isolation

### What Is an Actor?

An actor is a reference type that:
- Protects mutable state
- Allows only one task at a time
- Thread-safe by design

```swift
// All access to `data` is serialized
actor DataStore {
    private var data: [String: String] = [:]
    
    func set(_ value: String, for key: String) {
        data[key] = value
    }
    
    func get(_ key: String) -> String? {
        data[key]
    }
}

// Usage:
let store = DataStore()
await store.set("value", for: "key")
let value = await store.get("key")
```

### MainActor (The Most Important Actor)

`@MainActor` is a built-in actor that ensures code runs on the main thread.

**All SwiftUI Views are automatically `@MainActor`:**
```swift
// This is implicit - don't add @MainActor yourself
struct KeyboardView: View {
    var body: some View {
        Text("Hello")
    }
}

// But you can be explicit:
@MainActor
struct MyView: View {
    var body: some View {
        Text("Hello")
    }
}
```

### When to Use @MainActor

Use `@MainActor` for anything that touches UI:

```swift
@Observable
@MainActor
final class KeyboardManager {
    var keys: [KeyDefinition] = []  // UI state
    
    func updateKeys(_ newKeys: [KeyDefinition]) {
        self.keys = newKeys  // Automatically on main thread
    }
    
    // Background work is nonisolated
    nonisolated func loadFromDisk() async throws -> [KeyDefinition] {
        // Can't access `keys` here (it's @MainActor)
        let data = try JSONDecoder().decode(...)
        return data
    }
}
```

### Actor Reentrancy

**Reentrancy** is when an actor is called while already processing:

```swift
actor MessageQueue {
    private var messages: [String] = []
    
    func process(_ msg: String) async {
        // Point A: First entry
        await addMessage(msg)
        // Could get reentry here!
        // While awaiting addMessage, another task could call process()
    }
    
    func addMessage(_ msg: String) async {
        // This is async, so process() might be called again
        messages.append(msg)
    }
}
```

**Solution:** Check invariants at each await point:

```swift
actor MessageQueue {
    private var isProcessing = false
    private var messages: [String] = []
    
    func process(_ msg: String) async {
        // Check invariant before await
        guard !isProcessing else { return }
        isProcessing = true
        
        await addMessage(msg)
        
        // Re-check after await
        guard isProcessing else { return }
        isProcessing = false
    }
}
```

---

## MainActor Deep Dive

### Using MainActor Correctly

**For classes/structs with UI state:**
```swift
@Observable
@MainActor
final class KeyboardViewModel {
    var selectedKey: String?
    var suggestions: [String] = []
    
    // This is @MainActor automatically
    func updateSuggestions(_ new: [String]) {
        self.suggestions = new
    }
}
```

**For background work:**
```swift
@Observable
@MainActor
final class KeyboardViewModel {
    // UI state is @MainActor
    var keys: [KeyDefinition] = []
    
    // Background work is nonisolated
    nonisolated func loadKeys() async throws -> [KeyDefinition] {
        let data = try await fetchFromDisk()
        
        // Can't access self.keys here (it's @MainActor)
        // Instead, update from the call site:
        return data
    }
}

// In view:
struct KeyboardView {
    @State private var manager = KeyboardViewModel()
    
    var body: some View {
        Text("Keys: \(manager.keys.count)")
            .task {
                do {
                    let keys = try await manager.loadKeys()
                    manager.keys = keys  // Update on main thread
                } catch {
                    print("Error: \(error)")
                }
            }
    }
}
```

**For standalone functions:**
```swift
@MainActor
func updateUI(with data: [String]) {
    // This automatically runs on main thread
}

// Or inside a view:
struct MyView: View {
    @MainActor
    private func handleUpdate() {
        // This is on main thread
    }
}
```

### Calling @MainActor from Background

```swift
@MainActor
var globalCounter: Int = 0

// Background thread
nonisolated func incrementCounter() async {
    // Can't access globalCounter directly (it's @MainActor)
    
    // Option 1: Use MainActor.run
    await MainActor.run {
        globalCounter += 1
    }
    
    // Option 2: Call @MainActor function
    await updateUI()
}

@MainActor
func updateUI() {
    // On main thread
}
```

---

## Task Management

### Creating Tasks

**Task:** Run something now
```swift
Task {
    let data = await fetchData()
    print(data)
}
```

**Task with priority:**
```swift
Task(priority: .high) {
    let data = await fetchData()
}

// Priority levels: .background, .low, .medium, .high, .userInitiated
```

**Detached tasks:** Not inheriting parent's context
```swift
Task.detached {
    // No MainActor inheritance
    // No parent cancellation
}
```

### async let: Parallel Tasks

```swift
// Run multiple tasks in parallel
async let keys = loadKeys()
async let suggestions = loadSuggestions()

let (keyArray, suggestionArray) = await (keys, suggestions)
// Both run concurrently, waits for both
```

### Task Groups: Dynamic Task Count

```swift
// When you don't know how many tasks ahead of time
let results = try await withThrowingTaskGroup(of: String.self) { group in
    for url in urls {
        group.addTask {
            try await fetchData(from: url)
        }
    }
    
    var allResults: [String] = []
    for try await result in group {
        allResults.append(result)
    }
    return allResults
}
```

### Cancellation

```swift
let task = Task {
    while !Task.isCancelled {
        await doWork()
    }
}

// Cancel it
task.cancel()

// In SwiftUI:
struct MyView {
    var body: some View {
        Text("Data")
            .task {
                while !Task.isCancelled {
                    await fetchData()
                    try? await Task.sleep(nanoseconds: 1_000_000_000)
                }
            }
    }
}
```

---

## Common Pitfalls

### Pitfall 1: Forgetting await

```swift
// ❌ WRONG: Didn't await
let keys = loadKeys()  // Returns Task, not [KeyDefinition]

// ✅ CORRECT
let keys = await loadKeys()
```

### Pitfall 2: Calling async from sync

```swift
// ❌ WRONG: Can't call async from sync
func synchronousFunction() {
    let keys = await loadKeys()  // Error!
}

// ✅ CORRECT: Use Task
func synchronousFunction() {
    Task {
        let keys = await loadKeys()
    }
}
```

### Pitfall 3: Blocking the main thread

```swift
// ❌ WRONG: Blocks UI while loading
DispatchQueue.main.sync {
    let keys = loadKeysSync()  // Freezes app
}

// ✅ CORRECT: Use async
Task {
    let keys = try await loadKeys()  // Non-blocking
}
```

### Pitfall 4: Non-Sendable types

```swift
// ❌ WRONG
class NonSendableClass {
    var value: String = ""
}

Task.detached {
    let obj = NonSendableClass()
    // Error: Can't send across tasks
}

// ✅ CORRECT
struct SendableStruct: Sendable {
    let value: String
}

Task.detached {
    let obj = SendableStruct(value: "")  // OK
}
```

### Pitfall 5: Accessing shared state without isolation

```swift
// ❌ WRONG: Race condition
var counter = 0

Task { counter += 1 }
Task { counter += 1 }
// Both tasks might access counter at same time

// ✅ CORRECT: Isolated
@MainActor var counter = 0

Task { await MainActor.run { counter += 1 } }
Task { await MainActor.run { counter += 1 } }
```

---

## September Keyboard Patterns

### Pattern 1: Loading Keys on Startup

```swift
@Observable
@MainActor
final class KeyboardManager {
    var keys: [KeyDefinition] = []
    var isLoading = false
    var loadError: Error?
    
    // Background work
    nonisolated func loadKeysFromDisk() async throws -> [KeyDefinition] {
        let data = try Data(contentsOf: keysFileURL)
        return try JSONDecoder().decode([KeyDefinition].self, from: data)
    }
    
    // Main thread coordination
    func loadKeys() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            self.keys = try await loadKeysFromDisk()
        } catch {
            self.loadError = error
        }
    }
}

// In view:
struct KeyboardView {
    @State private var manager = KeyboardManager()
    
    var body: some View {
        VStack {
            if manager.isLoading {
                ProgressView()
            } else if let error = manager.loadError {
                Text("Error: \(error.localizedDescription)")
            } else {
                KeyboardGrid(keys: manager.keys)
            }
        }
        .task {
            await manager.loadKeys()
        }
    }
}
```

### Pattern 2: Fetching Suggestions with Debounce

```swift
@Observable
@MainActor
final class SuggestionManager {
    var suggestions: [String] = []
    var currentTask: Task<Void, Never>?
    
    nonisolated func fetchSuggestions(for text: String) async -> [String] {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return [] }
        
        // Simulate API call
        try? await Task.sleep(nanoseconds: 300_000_000)  // 300ms
        return ["suggestion1", "suggestion2"]
    }
    
    func updateSuggestions(for text: String) {
        // Cancel previous request
        currentTask?.cancel()
        
        // Debounce: wait 300ms before fetching
        currentTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000)
            
            if !Task.isCancelled {
                self.suggestions = await fetchSuggestions(for: text)
            }
        }
    }
}

// In view:
struct SuggestionsView {
    @State private var manager = SuggestionManager()
    @State private var inputText = ""
    
    var body: some View {
        VStack {
            TextField("Type", text: $inputText)
                .onChange(of: inputText) { _, newValue in
                    manager.updateSuggestions(for: newValue)
                }
            
            ForEach(manager.suggestions, id: \.self) { suggestion in
                Text(suggestion)
            }
        }
    }
}
```

### Pattern 3: Parallel Event Processing

```swift
@Observable
@MainActor
final class EventProcessor {
    var processingCount = 0
    
    nonisolated func processEvent(_ event: KeyboardEvent) async {
        // Background processing
        try? await Task.sleep(nanoseconds: 100_000_000)
        
        // Update UI on main thread
        await MainActor.run {
            self.processingCount += 1
        }
    }
    
    func processMultipleEvents(_ events: [KeyboardEvent]) {
        Task {
            async let results = withThrowingTaskGroup(of: Void.self) { group in
                for event in events {
                    group.addTask {
                        await self.processEvent(event)
                    }
                }
                
                for try await _ in group {
                    // Wait for all
                }
            }
            _ = try? await results
        }
    }
}
```

### Pattern 4: Background File Operations

```swift
@Observable
@MainActor
final class FileManager {
    var savedCount = 0
    var saveError: Error?
    
    nonisolated func saveKeysToFile(_ keys: [KeyDefinition], 
                                    to url: URL) async throws {
        let data = try JSONEncoder().encode(keys)
        try data.write(to: url)
    }
    
    func save(_ keys: [KeyDefinition]) {
        Task {
            do {
                try await saveKeysToFile(keys, to: keysFileURL)
                self.savedCount += 1
            } catch {
                self.saveError = error
            }
        }
    }
}
```

---

## Migration from Old Patterns

### From Combine to async/await

```swift
// OLD: Combine
class OldViewModel: ObservableObject {
    @Published var data: String = ""
    
    func load() {
        URLSession.shared.dataTaskPublisher(for: url)
            .map { String(data: $0.data, encoding: .utf8) ?? "" }
            .replaceError(with: "")
            .assign(to: &$data)
    }
}

// NEW: async/await
@Observable
@MainActor
final class NewViewModel {
    var data: String = ""
    
    func load() async {
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            self.data = String(data: data, encoding: .utf8) ?? ""
        } catch {
            self.data = ""
        }
    }
}
```

### From DispatchQueue to Tasks

```swift
// OLD: DispatchQueue
DispatchQueue.global().async {
    let result = expensiveOperation()
    DispatchQueue.main.async {
        self.data = result
    }
}

// NEW: async/await
Task {
    let result = await expensiveOperation()  // Background
    // Automatically on main thread if in @MainActor
}
```

---

## Swift 6.0 Migration Checklist

- [ ] Enable "Complete" concurrency checking in Build Settings
- [ ] Fix all global variable isolation issues
- [ ] Convert @Published to @Observable
- [ ] Replace ObservableObject with Observable classes
- [ ] Add @MainActor to ViewModel/Model classes
- [ ] Mark background work nonisolated
- [ ] Make data types Sendable where possible
- [ ] Use MainActor.run for cross-thread updates
- [ ] Test thoroughly with strict checking enabled

---

## Resources

- [Apple Swift Concurrency Documentation](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency)
- [WWDC 2024: Migrate your app to Swift 6](https://developer.apple.com/videos/play/wwdc2024/10169/)
- [Hacking with Swift: async/await](https://www.hackingwithswift.com/swift/6.0/concurrency)
- [Swift Evolution Proposals](https://github.com/swiftlang/swift-evolution)

---

**Last Updated:** February 27, 2026  
**Next Review:** September 2026  
**Maintained By:** September Team
