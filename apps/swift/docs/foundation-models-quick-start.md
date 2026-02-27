# Apple Foundation Models: Quick Start Guide for September Keyboard

## TL;DR

Use Apple Foundation Models to replace NSSpellChecker for intelligent, context-aware typing suggestions.

- **What:** Native macOS 26+ framework for on-device AI
- **Why:** Better suggestions, zero cost, complete privacy, offline-capable
- **How:** ~8 hours to integrate with graceful fallback
- **Impact:** Significantly improved user experience for accessibility keyboard

## Minimum Implementation (30 mins to try)

```swift
import FoundationModels

// 1. Check availability
switch SystemLanguageModel.default.availability {
case .available:
    print("Foundation Models ready!")
case .unavailable(let reason):
    print("Not available: \(reason)")
}

// 2. Create a session
let session = LanguageModelSession(
    instructions: "Generate helpful next-word suggestions."
)

// 3. Generate suggestions
let response = try await session.respond(
    to: "Complete this text: hello wo"
)
print(response.content)  // "rld", "w", etc.
```

## Full Integration Path

### Phase 1: Update SuggestionEngine.swift (2 hours)

```swift
import FoundationModels

@MainActor
final class SuggestionEngine {
    private var session: LanguageModelSession?
    private let model = SystemLanguageModel.default
    
    // Structured output type
    @Generable
    struct SuggestionResult {
        @Guide(description: "Best suggestion")
        let primary: String
        
        @Guide(description: "Alternatives (max 3)")
        @Guide(.maximumCount(3))
        let alternatives: [String]
    }
    
    // Initialize at app startup
    func initialize() async {
        guard case .available = model.availability else {
            print("Foundation Models unavailable")
            return
        }
        session = LanguageModelSession(
            instructions: "Generate next-word suggestions for accessibility keyboard."
        )
    }
    
    // Generate suggestions async
    func suggestions(for textBeforeCursor: String) async -> [String] {
        guard let session = session else {
            // Fallback to NSSpellChecker
            return spellCheckerSuggestions(for: textBeforeCursor)
        }
        
        do {
            let result = try await session.respond(
                to: textBeforeCursor,
                generating: SuggestionResult.self
            )
            var suggestions = [result.content.primary]
            suggestions.append(contentsOf: result.content.alternatives)
            return suggestions
        } catch {
            return spellCheckerSuggestions(for: textBeforeCursor)
        }
    }
    
    // Keep NSSpellChecker fallback
    private func spellCheckerSuggestions(for text: String) -> [String] {
        // ... existing implementation ...
    }
}
```

### Phase 2: Update TypingTracker.swift (1 hour)

Make suggestion generation async:

```swift
@Observable
final class TypingTracker {
    private let suggestionEngine: SuggestionEngine
    
    func updateText(_ newText: String) {
        Task {
            let newSuggestions = await suggestionEngine.suggestions(for: newText)
            await MainActor.run {
                self.suggestions = newSuggestions
            }
        }
    }
}
```

### Phase 3: Update SuggestionsBarView.swift (30 mins)

Add loading state:

```swift
@State private var isLoading = false

var body: some View {
    HStack {
        if isLoading {
            ProgressView().scaleEffect(0.8)
        } else {
            // ... existing suggestion chips ...
        }
    }
    .onChange(of: tracker.textBeforeCursor) { _, _ in
        isLoading = true
        // Updated by TypingTracker
    }
}
```

### Phase 4: Call initialize() at app startup (15 mins)

```swift
@main
struct SeptemberApp: App {
    @StateObject private var suggestionEngine = SuggestionEngine()
    
    var body: some Scene {
        WindowGroup {
            // ... main content ...
                .onAppear {
                    Task {
                        await suggestionEngine.initialize()
                    }
                }
        }
    }
}
```

## Requirements

**To Use Foundation Models:**
- macOS Tahoe (26) or later
- Apple Silicon (M1+)
- Apple Intelligence enabled in System Settings
- ~1.6GB free storage (model downloads on first use)

**Graceful Fallback:**
- NSSpellChecker on older macOS versions
- Dictionary-based suggestions if model unavailable

## Key APIs at a Glance

| API | Purpose | Example |
|-----|---------|---------|
| `SystemLanguageModel.default` | Access the on-device model | `let model = SystemLanguageModel.default` |
| `model.availability` | Check if model is ready | `if case .available = model.availability { ... }` |
| `LanguageModelSession` | Stateful conversation | `let session = LanguageModelSession(...)` |
| `session.respond(to:)` | Generate single response | `let response = try await session.respond(to: prompt)` |
| `session.streamResponse(to:)` | Stream response incrementally | `for try await partial in session.streamResponse(to: prompt) { ... }` |
| `@Generable` | Type-safe structured output | `@Generable struct MySuggestion { let text: String }` |
| `@Guide` | Constrain output fields | `@Guide(.range(0...100)) let confidence: Int` |

## Performance Expectations

| Metric | Value |
|--------|-------|
| Time to First Token | 10-50ms |
| Token Generation Rate | 30-50 tokens/second |
| Latency for 5-word suggestion | 200-300ms |
| Memory overhead | <100KB per session |
| Model in RAM | ~3-4GB (on-demand) |

**Acceptable?** 200-300ms is slightly slower than NSSpellChecker (<1ms), but provides vastly better suggestions. Users typically accept this for AI-powered features.

## Common Patterns

### Error Handling

```swift
do {
    let response = try await session.respond(to: prompt)
} catch GenerationError.exceededContextWindowSize {
    // Context limit reached (4,096 tokens)
    // Create new session or summarize previous context
} catch {
    print("Generation failed: \(error)")
}
```

### Checking Availability

```swift
func generateWithFallback(_ text: String) async -> String {
    guard case .available = SystemLanguageModel.default.availability else {
        return fallbackSpellChecker(text)
    }
    return try await session.respond(to: text).content
}
```

### Structured Output

```swift
@Generable
struct SuggestionResult {
    let suggestion: String
    @Guide(.range(0...100)) let confidence: Int
}

let result = try await session.respond(
    to: prompt,
    generating: SuggestionResult.self
)
print("Suggestion: \(result.content.suggestion) (\(result.content.confidence)%)")
```

## Limitations to Know

1. **4,096 Token Context Window** - Entire conversation (input + output) must fit
   - Typically fine for short interactions
   - Long conversations need summarization strategy

2. **macOS 26+ Required** - Backward compatibility via NSSpellChecker fallback

3. **Apple Intelligence Must Be Enabled** - Users opt-in via System Settings

4. **Apple Silicon (M1+) Only** - Intel Macs not supported

5. **~1.6GB Download** - Model downloads on first use (2-5 minutes)

## Next Steps

1. **Read Full Research** - See `/Users/raviatluri/work/september/FOUNDATION_MODELS_RESEARCH.md`
2. **Create Test Version** - Implement in a branch first
3. **Test on macOS 26 Device** - Verify suggestions work
4. **Measure Performance** - Profile latency and accuracy
5. **Gather User Feedback** - Is the slight latency trade-off worth better suggestions?

## Resources

- [Official Documentation](https://developer.apple.com/documentation/FoundationModels)
- [WWDC25: Meet Foundation Models](https://developer.apple.com/videos/play/wwdc2025/286/)
- [WWDC25: Deep Dive](https://developer.apple.com/videos/play/wwdc2025/301/)
- [Prompt Design & Safety](https://developer.apple.com/videos/play/wwdc2025/248/)

## Questions?

Refer to the comprehensive research document for details on:
- API surface area
- Tool calling patterns
- Multi-turn conversation strategies
- LoRA adapter fine-tuning
- Performance benchmarks
- Comparison to external APIs

---

*Quick reference for September keyboard app Foundation Models integration*
