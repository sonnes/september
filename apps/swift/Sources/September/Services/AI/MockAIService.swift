import Foundation

// MARK: - MockAIService
//
// Returns configurable responses for development and testing.

actor MockAIService: AIService {
    var response: String
    var delay: Duration
    var shouldThrow: AIServiceError?

    init(
        response: String = """
            ["I think that's a great idea", "Let me think about it", "Can you tell me more?"]
            """,
        delay: Duration = .milliseconds(200)
    ) {
        self.response = response
        self.delay = delay
        self.shouldThrow = nil
    }

    func generateText(prompt: String, system: String?, temperature: Double) async throws -> String {
        if delay > .zero {
            try await Task.sleep(for: delay)
        }
        if let error = shouldThrow {
            throw error
        }
        return response
    }
}
