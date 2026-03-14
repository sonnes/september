import Foundation

// MARK: - AIServiceFactory
//
// Creates the correct AIService implementation from provider + config.
// Returns nil when a cloud provider requires an API key and none is provided.

enum AIServiceFactory {
    static func create(
        provider: AIProvider,
        apiKey: String?,
        model: String?,
        session: URLSession = .shared
    ) -> (any AIService)? {
        switch provider {
        case .openai:
            guard let apiKey, !apiKey.isEmpty else { return nil }
            return OpenAIService(apiKey: apiKey, model: model ?? "gpt-4o", session: session)
        case .anthropic:
            guard let apiKey, !apiKey.isEmpty else { return nil }
            return AnthropicService(
                apiKey: apiKey, model: model ?? "claude-sonnet-4-20250514", session: session)
        case .ollama:
            return OllamaService(model: model ?? "llama3", session: session)
        case .foundationModels:
            return nil  // Not implemented in Phase 2
        }
    }
}
