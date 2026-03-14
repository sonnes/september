import Foundation

// MARK: - AI Provider Registry
//
// Centralized metadata for AI providers. Mirrors web app's
// packages/ai/lib/registry.ts pattern. Used by Settings UI
// to populate provider cards, model dropdowns, and API key fields.

struct AIModelInfo: Sendable {
    let id: String
    let name: String
    let description: String
}

struct AIProviderInfo: Sendable {
    let id: AIProvider
    let name: String
    let description: String
    let requiresAPIKey: Bool
    let apiKeyURL: URL?
    let models: [AIModelInfo]
}

enum AIProviderRegistry {

    static let providers: [AIProvider: AIProviderInfo] = [
        .openai: AIProviderInfo(
            id: .openai,
            name: "OpenAI",
            description: "GPT-4o, GPT-4",
            requiresAPIKey: true,
            apiKeyURL: URL(string: "https://platform.openai.com/api-keys"),
            models: [
                AIModelInfo(id: "gpt-4o", name: "GPT-4o", description: "Fast and capable"),
                AIModelInfo(id: "gpt-4", name: "GPT-4", description: "Most capable"),
            ]
        ),
        .anthropic: AIProviderInfo(
            id: .anthropic,
            name: "Anthropic",
            description: "Claude Sonnet 4, Claude 4",
            requiresAPIKey: true,
            apiKeyURL: URL(string: "https://console.anthropic.com/settings/keys"),
            models: [
                AIModelInfo(
                    id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4",
                    description: "Fast and capable"),
                AIModelInfo(
                    id: "claude-4-20250514", name: "Claude 4",
                    description: "Most capable"),
            ]
        ),
        .ollama: AIProviderInfo(
            id: .ollama,
            name: "Ollama",
            description: "Local models, no API key",
            requiresAPIKey: false,
            apiKeyURL: nil,
            models: []  // Populated dynamically via OllamaService.listModels()
        ),
    ]

    static func providerInfo(_ provider: AIProvider) -> AIProviderInfo? {
        providers[provider]
    }

    static func modelsForProvider(_ provider: AIProvider) -> [AIModelInfo] {
        providers[provider]?.models ?? []
    }
}
