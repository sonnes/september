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
