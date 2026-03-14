import Testing

@testable import September

@Suite("AIProviderRegistry")
struct AIProviderRegistryTests {

    @Test("All three providers are registered")
    func allProvidersRegistered() {
        #expect(AIProviderRegistry.providerInfo(.openai) != nil)
        #expect(AIProviderRegistry.providerInfo(.anthropic) != nil)
        #expect(AIProviderRegistry.providerInfo(.ollama) != nil)
    }

    @Test("OpenAI requires API key")
    func openaiRequiresKey() {
        let info = AIProviderRegistry.providerInfo(.openai)!
        #expect(info.requiresAPIKey == true)
        #expect(info.apiKeyURL != nil)
    }

    @Test("Anthropic requires API key")
    func anthropicRequiresKey() {
        let info = AIProviderRegistry.providerInfo(.anthropic)!
        #expect(info.requiresAPIKey == true)
        #expect(info.apiKeyURL != nil)
    }

    @Test("Ollama does not require API key")
    func ollamaNoKey() {
        let info = AIProviderRegistry.providerInfo(.ollama)!
        #expect(info.requiresAPIKey == false)
    }

    @Test("OpenAI has models")
    func openaiModels() {
        let models = AIProviderRegistry.modelsForProvider(.openai)
        #expect(!models.isEmpty)
        #expect(models.contains { $0.id == "gpt-4o" })
    }

    @Test("Anthropic has models")
    func anthropicModels() {
        let models = AIProviderRegistry.modelsForProvider(.anthropic)
        #expect(!models.isEmpty)
        #expect(models.contains { $0.id.contains("claude") })
    }

    @Test("Ollama has empty static models (populated dynamically)")
    func ollamaModels() {
        let models = AIProviderRegistry.modelsForProvider(.ollama)
        #expect(models.isEmpty)
    }

    @Test("Foundation Models not in registry")
    func foundationModelsNotRegistered() {
        #expect(AIProviderRegistry.providerInfo(.foundationModels) == nil)
    }
}
