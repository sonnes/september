import Foundation
import Testing

@testable import September

@Suite("PredictionEngine", .serialized)
@MainActor
struct PredictionEngineTests {

    private func makeEngine(
        response: String = """
            ["I think that's great", "Let me consider that", "Can you explain more?"]
            """,
        delay: Duration = .zero
    ) -> (PredictionEngine, MockAIService) {
        let mock = MockAIService(response: response, delay: delay)
        let engine = PredictionEngine(debounceInterval: .zero)
        engine.configureWithService(mock)
        return (engine, mock)
    }

    // MARK: - Debounce & Generation

    @Test("Text change triggers predictions after debounce")
    func textChangeTriggersPredictions() async throws {
        let (engine, _) = makeEngine()

        engine.textDidChange("Hello")
        // With zero debounce, generation should fire immediately
        // Give the async task time to complete
        try await Task.sleep(for: .milliseconds(300))

        #expect(engine.predictions.count == 3)
        #expect(engine.predictions[0] == "I think that's great")
    }

    @Test("Empty text clears predictions")
    func emptyTextClearsPredictions() async throws {
        let (engine, _) = makeEngine()

        // First generate some predictions
        engine.textDidChange("Hello")
        try await Task.sleep(for: .milliseconds(300))
        #expect(!engine.predictions.isEmpty)

        // Now clear
        engine.textDidChange("")
        try await Task.sleep(for: .milliseconds(300))
        #expect(engine.predictions.isEmpty)
        #expect(engine.wordSuggestions.isEmpty)
    }

    @Test("Whitespace-only text clears predictions")
    func whitespaceOnlyClearsPredictions() async throws {
        let (engine, _) = makeEngine()

        engine.textDidChange("   ")
        try await Task.sleep(for: .milliseconds(300))
        #expect(engine.predictions.isEmpty)
    }

    // MARK: - JSON Parsing

    @Test("Parses markdown-fenced JSON response")
    func markdownFencedJSON() async throws {
        let (engine, _) = makeEngine(response: """
            ```json
            ["First sentence", "Second sentence", "Third sentence"]
            ```
            """)

        engine.textDidChange("Test")
        try await Task.sleep(for: .milliseconds(300))

        #expect(engine.predictions.count == 3)
        #expect(engine.predictions[0] == "First sentence")
    }

    @Test("Invalid JSON preserves stale predictions")
    func invalidJSONKeepsStale() async throws {
        let (engine, mock) = makeEngine()

        // Generate valid predictions first
        engine.textDidChange("Hello")
        try await Task.sleep(for: .milliseconds(300))
        #expect(engine.predictions.count == 3)

        // Now return invalid JSON
        await mock.setResponse("This is not JSON at all")
        engine.textDidChange("Hello world")
        try await Task.sleep(for: .milliseconds(300))

        // Stale predictions should remain
        #expect(engine.predictions.count == 3)
    }

    @Test("Empty array response clears predictions")
    func emptyArrayResponse() async throws {
        let (engine, _) = makeEngine(response: "[]")

        engine.textDidChange("Test")
        try await Task.sleep(for: .milliseconds(300))

        #expect(engine.predictions.isEmpty)
    }

    @Test("Limits to 3 predictions")
    func limitsToThree() async throws {
        let (engine, _) = makeEngine(response: """
            ["One", "Two", "Three", "Four", "Five"]
            """)

        engine.textDidChange("Test")
        try await Task.sleep(for: .milliseconds(300))

        #expect(engine.predictions.count == 3)
    }

    // MARK: - Selection

    @Test("Select prediction clears predictions array")
    func selectPredictionClears() async throws {
        let (engine, _) = makeEngine()

        engine.textDidChange("Hello")
        try await Task.sleep(for: .milliseconds(300))
        #expect(engine.predictions.count == 3)

        engine.selectPrediction("I think that's great")
        #expect(engine.predictions.isEmpty)
    }

    @Test("Select word removes it from suggestions")
    func selectWordRemoves() async throws {
        let (engine, _) = makeEngine()

        // Manually set word suggestions for testing
        engine.wordSuggestions = ["hello", "help", "held", "helm", "hero"]

        engine.selectWord("help")
        #expect(!engine.wordSuggestions.contains("help"))
        #expect(engine.wordSuggestions.count == 4)
    }

    // MARK: - Error Handling

    @Test("Nil service sets providerUnavailable error")
    func nilServiceError() async throws {
        let engine = PredictionEngine(debounceInterval: .zero)
        // Don't configure any service

        engine.textDidChange("Hello")
        try await Task.sleep(for: .milliseconds(300))

        #expect(engine.predictions.isEmpty)
        if case .providerUnavailable = engine.error {
            // Expected
        } else {
            Issue.record("Expected providerUnavailable error, got \(String(describing: engine.error))")
        }
    }

    @Test("Auth error sets error property")
    func authErrorSetsProperty() async throws {
        let (engine, mock) = makeEngine()
        await mock.setThrowError(.invalidAPIKey)

        engine.textDidChange("Hello")
        try await Task.sleep(for: .milliseconds(300))

        #expect(engine.error?.isAuthError == true)
    }

    @Test("Error clears on successful response")
    func errorClearsOnSuccess() async throws {
        let (engine, mock) = makeEngine()

        // First cause an error
        await mock.setThrowError(.invalidAPIKey)
        engine.textDidChange("Hello")
        try await Task.sleep(for: .milliseconds(300))
        #expect(engine.error != nil)

        // Now fix it
        await mock.setThrowError(nil)
        await mock.setResponse("""
            ["Fixed response"]
            """)
        engine.textDidChange("Hello again")
        try await Task.sleep(for: .milliseconds(300))

        #expect(engine.error == nil)
        #expect(engine.predictions.count == 1)
    }

    // MARK: - Optimistic UI

    @Test("Predictions preserved during loading")
    func optimisticUI() async throws {
        // Use a delay so we can observe the loading state
        let (engine, _) = makeEngine(delay: .milliseconds(100))

        // First generate predictions quickly with no delay
        let quickMock = MockAIService(
            response: """
                ["Stale prediction"]
                """,
            delay: .zero
        )
        engine.configureWithService(quickMock)
        engine.textDidChange("Hello")
        try await Task.sleep(for: .milliseconds(300))
        #expect(engine.predictions == ["Stale prediction"])

        // Now switch to slow service and trigger new predictions
        let slowMock = MockAIService(
            response: """
                ["New prediction"]
                """,
            delay: .milliseconds(1000)
        )
        engine.configureWithService(slowMock)
        engine.textDidChange("Hello world")
        try await Task.sleep(for: .milliseconds(300))

        // Stale predictions should still be visible while loading
        #expect(engine.isLoading == true)
        #expect(engine.predictions == ["Stale prediction"])

        // Wait for new predictions
        try await Task.sleep(for: .milliseconds(1000))
        #expect(engine.predictions == ["New prediction"])
        #expect(engine.isLoading == false)
    }

    // MARK: - Configure

    @Test("Configure cancels in-flight tasks")
    func configureCancels() async throws {
        let slowMock = MockAIService(
            response: """
                ["Should not appear"]
                """,
            delay: .milliseconds(500)
        )
        let engine = PredictionEngine(debounceInterval: .zero)
        engine.configureWithService(slowMock)

        engine.textDidChange("Hello")
        try await Task.sleep(for: .milliseconds(300))

        // Reconfigure — should cancel the slow request
        let fastMock = MockAIService(
            response: """
                ["Fast response"]
                """,
            delay: .zero
        )
        engine.configureWithService(fastMock)
        engine.textDidChange("Hello again")
        try await Task.sleep(for: .milliseconds(300))

        #expect(engine.predictions == ["Fast response"])
    }
}

// MARK: - MockAIService test helpers

extension MockAIService {
    func setResponse(_ newResponse: String) {
        self.response = newResponse
    }
    func setThrowError(_ error: AIServiceError?) {
        self.shouldThrow = error
    }
}
