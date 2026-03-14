import Foundation
import SwiftData
import Testing

@testable import September

@Suite("Account Model")
struct AccountTests {

    private func makeContainer() throws -> ModelContainer {
        let schema = Schema([Account.self, Document.self, Panel.self, PanelButton.self])
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        return try ModelContainer(for: schema, configurations: [config])
    }

    @Test("Create and fetch account")
    func createAndFetch() throws {
        let container = try makeContainer()
        let context = ModelContext(container)

        let account = Account(name: "Test User", city: "Portland")
        context.insert(account)
        try context.save()

        let descriptor = FetchDescriptor<Account>()
        let accounts = try context.fetch(descriptor)

        #expect(accounts.count == 1)
        #expect(accounts[0].name == "Test User")
        #expect(accounts[0].city == "Portland")
        #expect(accounts[0].onboardingCompleted == false)
    }

    @Test("Update account fields")
    func updateFields() throws {
        let container = try makeContainer()
        let context = ModelContext(container)

        let account = Account(name: "Original")
        context.insert(account)
        try context.save()

        account.name = "Updated"
        account.primaryDiagnosis = "ALS"
        account.termsAccepted = true
        try context.save()

        let fetched = try context.fetch(FetchDescriptor<Account>())
        #expect(fetched[0].name == "Updated")
        #expect(fetched[0].primaryDiagnosis == "ALS")
        #expect(fetched[0].termsAccepted == true)
    }

    @Test("Delete account")
    func deleteAccount() throws {
        let container = try makeContainer()
        let context = ModelContext(container)

        let account = Account(name: "To Delete")
        context.insert(account)
        try context.save()

        context.delete(account)
        try context.save()

        let fetched = try context.fetch(FetchDescriptor<Account>())
        #expect(fetched.isEmpty)
    }

    @Test("AI config defaults roundtrip through SwiftData")
    func aiConfigDefaults() throws {
        let container = try makeContainer()
        let context = ModelContext(container)

        let account = Account(name: "Config Test")
        context.insert(account)
        try context.save()

        let fetched = try context.fetch(FetchDescriptor<Account>())
        let config = fetched[0].aiSuggestions

        #expect(config.enabled == false)
        #expect(config.provider == .openai)
        #expect(config.temperature == 0.7)
        #expect(config.maxSuggestions == 5)
    }

    @Test("Modified AI config persists")
    func modifiedAiConfig() throws {
        let container = try makeContainer()
        let context = ModelContext(container)

        let account = Account(name: "Config Modify")
        account.aiSuggestions.enabled = true
        account.aiSuggestions.provider = .anthropic
        account.aiSuggestions.temperature = 0.3
        account.aiSpeech.provider = .elevenlabs
        account.aiSpeech.voiceId = "voice-123"
        context.insert(account)
        try context.save()

        let fetched = try context.fetch(FetchDescriptor<Account>())
        #expect(fetched[0].aiSuggestions.enabled == true)
        #expect(fetched[0].aiSuggestions.provider == .anthropic)
        #expect(fetched[0].aiSuggestions.temperature == 0.3)
        #expect(fetched[0].aiSpeech.provider == .elevenlabs)
        #expect(fetched[0].aiSpeech.voiceId == "voice-123")
    }

    @Test("SuggestionsConfig Codable roundtrip with all defaults")
    func suggestionsConfigCodable() throws {
        let config = SuggestionsConfig()
        let data = try JSONEncoder().encode(config)
        let decoded = try JSONDecoder().decode(SuggestionsConfig.self, from: data)

        #expect(decoded.enabled == false)
        #expect(decoded.provider == .openai)
        #expect(decoded.temperature == 0.7)
        #expect(decoded.maxSuggestions == 5)
        #expect(decoded.contextWindow == 10)
        #expect(decoded.systemInstructions == nil)
    }

    // MARK: - API Keys

    @Test("API key roundtrip through SwiftData")
    func apiKeyRoundtrip() throws {
        let container = try makeContainer()
        let context = ModelContext(container)

        let account = Account(name: "Key Test")
        account.setAPIKey("sk-test-key-12345", for: .openai)
        account.setAPIKey("ant-key-67890", for: .anthropic)
        context.insert(account)
        try context.save()

        let fetched = try context.fetch(FetchDescriptor<Account>())
        #expect(fetched[0].apiKey(for: .openai) == "sk-test-key-12345")
        #expect(fetched[0].apiKey(for: .anthropic) == "ant-key-67890")
        #expect(fetched[0].apiKey(for: .ollama) == nil)
    }

    @Test("API key returns nil for empty string")
    func apiKeyEmptyString() {
        let account = Account(name: "Empty Key")
        account.apiKeys["openai"] = ""
        #expect(account.apiKey(for: .openai) == nil)
    }

    @Test("Masked API key shows first 3 and last 4 characters")
    func maskedApiKey() {
        let account = Account(name: "Mask Test")
        account.setAPIKey("sk-1234567890abcdef", for: .openai)
        #expect(account.maskedAPIKey(for: .openai) == "sk-••••cdef")
    }

    @Test("Masked API key returns full key when short")
    func maskedApiKeyShort() {
        let account = Account(name: "Short Key")
        account.setAPIKey("abc", for: .openai)
        #expect(account.maskedAPIKey(for: .openai) == "abc")
    }

    @Test("Masked API key returns nil when no key")
    func maskedApiKeyNil() {
        let account = Account(name: "No Key")
        #expect(account.maskedAPIKey(for: .openai) == nil)
    }

    @Test("Set API key updates timestamp")
    func setApiKeyUpdatesTimestamp() throws {
        let account = Account(name: "Timestamp Test")
        let before = account.updatedAt
        // Small sleep to ensure time difference
        try Task.checkCancellation()
        account.setAPIKey("key", for: .openai)
        #expect(account.updatedAt >= before)
    }

    // MARK: - Codable Roundtrips

    @Test("SpeechConfig Codable roundtrip")
    func speechConfigCodable() throws {
        var config = SpeechConfig()
        config.provider = .elevenlabs
        config.voiceId = "abc"
        config.speed = 1.5

        let data = try JSONEncoder().encode(config)
        let decoded = try JSONDecoder().decode(SpeechConfig.self, from: data)

        #expect(decoded.provider == .elevenlabs)
        #expect(decoded.voiceId == "abc")
        #expect(decoded.speed == 1.5)
    }
}
