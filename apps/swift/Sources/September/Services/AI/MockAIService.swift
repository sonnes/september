import Foundation

// MARK: - MockAIService
//
// Returns canned responses for development and testing.

actor MockAIService: AIService {
    func generateText(prompt: String, system: String?, temperature: Double) async throws -> String {
        // Simulate network latency
        try await Task.sleep(for: .milliseconds(200))
        return "Mock AI response for: \(prompt)"
    }
}
