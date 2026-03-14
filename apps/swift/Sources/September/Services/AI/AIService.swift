import Foundation

// MARK: - AIService Protocol
//
// Abstraction for AI text generation. Concrete implementations
// will wrap OpenAI, Anthropic, Ollama, or Foundation Models.
//
// generateStructured<T> is intentionally omitted — it will be
// added in Phase 2 when a real consumer exists, to avoid the
// existential type (`any AIService`) limitation of generic methods.

protocol AIService: Sendable {
    func generateText(prompt: String, system: String?, temperature: Double) async throws -> String
}
