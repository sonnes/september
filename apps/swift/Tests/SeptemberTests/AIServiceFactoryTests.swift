import Testing

@testable import September

@Suite("AIServiceFactory")
struct AIServiceFactoryTests {

    @Test("OpenAI with valid key returns service")
    func openaiWithKey() {
        let service = AIServiceFactory.create(provider: .openai, apiKey: "sk-test", model: "gpt-4o")
        #expect(service != nil)
        #expect(service is OpenAIService)
    }

    @Test("OpenAI without key returns nil")
    func openaiNoKey() {
        let service = AIServiceFactory.create(provider: .openai, apiKey: nil, model: "gpt-4o")
        #expect(service == nil)
    }

    @Test("Anthropic with valid key returns service")
    func anthropicWithKey() {
        let service = AIServiceFactory.create(provider: .anthropic, apiKey: "ant-key", model: nil)
        #expect(service != nil)
        #expect(service is AnthropicService)
    }

    @Test("Anthropic without key returns nil")
    func anthropicNoKey() {
        let service = AIServiceFactory.create(provider: .anthropic, apiKey: nil, model: nil)
        #expect(service == nil)
    }

    @Test("Ollama returns service without key")
    func ollamaNoKey() {
        let service = AIServiceFactory.create(provider: .ollama, apiKey: nil, model: "llama3")
        #expect(service != nil)
        #expect(service is OllamaService)
    }

    @Test("Foundation models returns nil (not implemented)")
    func foundationModels() {
        let service = AIServiceFactory.create(provider: .foundationModels, apiKey: nil, model: nil)
        #expect(service == nil)
    }
}
