# Foundation Models API Reference

## Import

```swift
import FoundationModels
```

---

## SystemLanguageModel

**Purpose:** Entry point to access Apple's on-device language model.

### Properties

```swift
let model = SystemLanguageModel.default

// Check if model is available and ready to use
switch model.availability {
case .available:
    // Safe to use the model
    
case .unavailable(let reason):
    // Model not available
    // reason: ModelUnavailabilityReason
}
```

### ModelUnavailabilityReason

```swift
enum ModelUnavailabilityReason {
    case deviceMemoryLow
    case lowBattery
    case modelNotDownloaded
    case unsupportedDevice
    case userOptedOut
    // ... other cases
}
```

---

## LanguageModelSession

**Purpose:** Maintains stateful conversation with the language model.

### Initialization

```swift
// Basic initialization
let session = LanguageModelSession()

// With custom instructions (system prompt)
let session = LanguageModelSession(
    instructions: "You are a helpful assistant."
)

// Full initialization
let session = LanguageModelSession(
    model: SystemLanguageModel.default,
    instructions: "Custom system prompt",
    guardrails: .default,
    tools: [myCustomTool]
)

// Restore from previous transcript
let session = LanguageModelSession(
    transcript: previousTranscript,
    instructions: "Resumed session"
)
```

### Methods

#### respond(to:) - Non-Streaming

```swift
// Simple string response
let response = try await session.respond(to: "Hello, how are you?")
let text = response.content  // String

// With generation options
var options = GenerationOptions()
options.temperature = 0.7  // 0.0 (deterministic) to 1.0 (creative)

let response = try await session.respond(
    to: "Suggest a word after 'hello'",
    options: options
)
```

#### respond(generating:) - Structured Output

```swift
@Generable
struct MyOutput {
    let field1: String
    let field2: Int
}

let response = try await session.respond(
    to: "Generate structured data",
    generating: MyOutput.self
)

let result = response.content  // MyOutput
print(result.field1)
print(result.field2)
```

#### streamResponse(to:) - Streaming

```swift
// Stream response as it's generated
let stream = session.streamResponse(to: "Write a poem")

for try await partial in stream {
    // Update UI with partial result
    print(partial.asPartiallyGenerated())
}
```

### Properties

```swift
let session = LanguageModelSession()

// Full conversation transcript
let entries = session.transcript  // [Entry]

// Each entry has:
// - role: MessageRole (.user, .assistant)
// - content: MessageContent

for entry in session.transcript {
    print("\(entry.role): \(entry.content)")
}
```

### Response Object

```swift
let response = try await session.respond(to: "...")

let content = response.content           // T (generic type)
let tokenCount = response.usedTokenCount // Int (tokens used in this call)
```

---

## Macros for Structured Output

### @Generable

Marks a struct/enum for automatic model generation.

```swift
@Generable
struct Suggestion {
    let text: String
    let confidence: Int
}

// Generates:
// - JSON schema for model
// - Decoding logic
// - PartiallyGenerated variant for streaming
```

### @Guide

Constrains individual fields.

```swift
@Generable
struct MovieRecommendation {
    @Guide(description: "Movie title")
    let title: String
    
    @Guide(description: "Brief summary in 1-2 sentences")
    let summary: String
    
    @Guide(.anyOf(["G", "PG", "PG-13", "R"]))
    let rating: String
    
    @Guide(.range(0...10))
    let score: Int
    
    @Guide(.count(3))
    let actors: [String]  // Exactly 3
}
```

### @Guide Constraints

```swift
// String constraints
@Guide(.regex("^[A-Z][a-z]+$"))  // Starts with capital, lowercase after
let name: String

// Array constraints
@Guide(.minimumCount(1))
let minimum: [String]

@Guide(.maximumCount(5))
let maximum: [String]

@Guide(.count(3))
let exact: [String]

// Enum constraints
@Guide(.anyOf(["option1", "option2", "option3"]))
let choice: String

// Numeric constraints
@Guide(.range(0...100))
let score: Int

@Guide(.range(0.0...1.0))
let probability: Double
```

---

## Tool Calling

### Tool Protocol

```swift
struct MyTool: Tool {
    let name = "myToolName"  // Short identifier, no spaces
    let description = "What this tool does"
    
    @Generable
    struct Arguments {
        let param1: String
        let param2: Int
    }
    
    func call(arguments: Arguments) async throws -> ToolOutput {
        // Perform action
        let result = "Result of action"
        return ToolOutput(result)
    }
}
```

### ToolOutput

```swift
// String output
return ToolOutput("Text result")

// Structured output
@Generable
struct Result {
    let value: String
}

return ToolOutput(Result(value: "text"))
```

### Using Tools in Session

```swift
let tool = MyTool()
let session = LanguageModelSession(
    tools: [tool]
)

// When you call respond, the model can decide to use the tool
let response = try await session.respond(to: "Use the tool to...")
// Framework automatically calls tool.call() if model invokes it
```

---

## Error Handling

### GenerationError

```swift
do {
    let response = try await session.respond(to: prompt)
} catch GenerationError.exceededContextWindowSize {
    // Session exceeded 4,096 token limit
    // Solution: Create new session or summarize context
    
} catch GenerationError.modelUnavailable {
    // Model not available (low battery, not downloaded, etc)
    
} catch GenerationError.contentFiltered {
    // Output was filtered by safety guardrails
    
} catch {
    // Other error
    print(error)
}
```

---

## GenerationOptions

```swift
var options = GenerationOptions()

// Control randomness/creativity
// 0.0 = deterministic, same output every time
// 1.0 = creative, varied outputs
options.temperature = 0.7

// Use in respond
let response = try await session.respond(
    to: prompt,
    options: options
)
```

---

## Complete Example: Accessibility Keyboard

```swift
import Foundation
import FoundationModels

@MainActor
final class AccessibilityKeyboardEngine {
    private var session: LanguageModelSession?
    private let model = SystemLanguageModel.default
    
    @Generable
    struct KeyboardSuggestion {
        @Guide(description: "Best next word")
        let primary: String
        
        @Guide(description: "Alternative words (max 2)")
        @Guide(.maximumCount(2))
        let alternatives: [String]
    }
    
    // Call at app startup
    func initialize() async {
        guard case .available = model.availability else { return }
        
        session = LanguageModelSession(
            instructions: """
            You help with typing suggestions for accessibility.
            Suggest the most likely next word based on context.
            """
        )
    }
    
    // Generate suggestions
    func suggestions(for textBeforeCursor: String) async -> [String] {
        guard let session = session else { return [] }
        
        do {
            let result = try await session.respond(
                to: "Next word after: \(textBeforeCursor)",
                generating: KeyboardSuggestion.self
            )
            
            var suggestions = [result.content.primary]
            suggestions.append(contentsOf: result.content.alternatives)
            return suggestions.filter { !$0.isEmpty }
            
        } catch {
            print("Error: \(error)")
            return []
        }
    }
    
    // Stream suggestions for real-time UI
    func streamSuggestions(for text: String) -> AsyncThrowingStream<[String], Error> {
        AsyncThrowingStream { continuation in
            Task {
                guard let session = session else {
                    continuation.finish()
                    return
                }
                
                do {
                    for try await partial in session.streamResponse(to: text) {
                        // partial is partially filled structure
                        var suggestions: [String] = []
                        if let primary = partial.asPartiallyGenerated().primary {
                            suggestions.append(primary)
                        }
                        if let alternatives = partial.asPartiallyGenerated().alternatives {
                            suggestions.append(contentsOf: alternatives)
                        }
                        continuation.yield(suggestions)
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }
}
```

---

## Key Differences: respond() vs streamResponse()

### respond() - Non-Streaming

```swift
// Waits for entire response before returning
let response = try await session.respond(to: prompt)
// UI updates once with complete text
```

**Pros:**
- Simple, straightforward
- Complete response guaranteed
- No partial updates to handle

**Cons:**
- Feels slower (no incremental updates)
- Longer perceived latency

### streamResponse() - Streaming

```swift
// Returns AsyncSequence of partial results
for try await partial in session.streamResponse(to: prompt) {
    // Update UI with each token as it appears
}
```

**Pros:**
- Real-time updates (feels faster)
- Better perceived performance
- Can stop early if needed

**Cons:**
- More complex to handle partials
- Requires @Generable struct for structured output

---

## Best Practices

1. **Check availability before using:**
   ```swift
   guard case .available = SystemLanguageModel.default.availability else {
       return fallbackSuggestions()
   }
   ```

2. **Create session once, reuse many times:**
   ```swift
   @State private var session: LanguageModelSession?
   // Initialize once, use for multiple requests
   ```

3. **Prewarm session before user interaction:**
   ```swift
   session?.prewarm()  // Loads model into memory
   ```

4. **Handle context window limit:**
   ```swift
   if session.transcript.count > 50 {
       // Create new session with summary
   }
   ```

5. **Use structured output (@Generable) for predictability:**
   ```swift
   // Better than parsing free-form strings
   let result = try await session.respond(
       to: prompt,
       generating: MyStructure.self
   )
   ```

6. **Provide clear instructions:**
   ```swift
   LanguageModelSession(
       instructions: """
       You are helping with accessibility.
       Be concise. Suggest practical words.
       """
   )
   ```

---

## Limitations

| Limit | Value | Notes |
|-------|-------|-------|
| Context Window | 4,096 tokens | Total input + output per session |
| Model Size | ~3B parameters | 2-bit quantized |
| Input Latency | 10-50ms | Time to first token |
| Generation Speed | 30-50 tokens/sec | On Apple Silicon |
| Storage | ~1.6GB | Model download size |
| Min OS | macOS 26+ | Not available on Sonoma or earlier |
| Min Device | M1+ | Apple Silicon required |

---

## Resources

- [Apple Documentation](https://developer.apple.com/documentation/FoundationModels)
- [WWDC25 Sessions](https://developer.apple.com/videos/machine-learning/)
- [Full Research Document](./FOUNDATION_MODELS_RESEARCH.md)
- [Quick Start Guide](./FOUNDATION_MODELS_QUICK_START.md)

